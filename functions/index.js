// Cloud Function: scanReceipt
//
// Triggered when an image is uploaded to Firebase Storage at
// receipts/{userId}/{receiptId}__{filename}.
// Calls Google Cloud Vision (DOCUMENT_TEXT_DETECTION), parses vendor / date /
// amount with confidence, runs a sanity-check on gas receipts (gallons * $/gal
// must equal total), and writes the result back to the matching Firestore doc.

const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const vision = require("@google-cloud/vision");

initializeApp();
setGlobalOptions({ region: "us-east1" });

const visionClient = new vision.ImageAnnotatorClient();

exports.scanReceipt = onObjectFinalized(
  { region: "us-east1", memory: "512MiB", timeoutSeconds: 60, cpu: 1 },
  async (event) => {
    const filePath = event.data.name || "";
    const bucket = event.data.bucket;
    const contentType = event.data.contentType || "";

    if (!filePath.startsWith("receipts/")) return null;
    const isImage = contentType.startsWith("image/");
    const isPdf = contentType === "application/pdf";
    if (!isImage && !isPdf) return null;

    const parts = filePath.split("/");
    if (parts.length < 3) return null;
    const fileName = parts.slice(2).join("/");
    const receiptId = fileName.includes("__") ? fileName.split("__")[0] : null;
    if (!receiptId) return null;

    const db = getFirestore();
    const docRef = db.collection("receipts").doc(receiptId);

    try {
      await docRef.set(
        {
          ocrStatus: "scanning",
          imageUrl: "gs://" + bucket + "/" + filePath,
          imagePath: filePath,
          scanStartedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      const gcsUri = "gs://" + bucket + "/" + filePath;
      let annotation;
      if (isPdf) {
        // Vision API requires the batchAnnotateFiles entry point for PDF input.
        // It processes up to 5 pages per call; EZPass statements are typically
        // 1-3 pages. We concatenate fullTextAnnotation.text from each page so
        // the rest of the parser code (vendor/date/amount) sees a single
        // text blob just like an image scan would.
        const [batchResult] = await visionClient.batchAnnotateFiles({
          requests: [{
            inputConfig: {
              gcsSource: { uri: gcsUri },
              mimeType: "application/pdf",
            },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
            pages: [1, 2, 3, 4, 5],
          }],
        });
        const responses = (batchResult.responses && batchResult.responses[0] && batchResult.responses[0].responses) || [];
        const combinedText = responses.map((r) => (r.fullTextAnnotation && r.fullTextAnnotation.text) || "").join("\n");
        const combinedPages = responses.flatMap((r) => (r.fullTextAnnotation && r.fullTextAnnotation.pages) || []);
        annotation = { text: combinedText, pages: combinedPages };
      } else {
        const [result] = await visionClient.documentTextDetection(gcsUri);
        annotation = result.fullTextAnnotation;
      }

      if (!annotation || !annotation.text) {
        await docRef.set(
          {
            ocrStatus: "failed",
            ocrError: "No text detected. Image may be too blurry.",
            scanCompletedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        return null;
      }

      const parsed = parseReceipt(annotation);
      const inferredCategory = categoryFor(parsed.fields.vendor.value, annotation.text);
      await docRef.set(
        {
          ocrStatus: parsed.status,
          ocrConfidence: parsed.overallConfidence,
          ocrText: annotation.text,
          ocrFields: parsed.fields,
          vendor: parsed.fields.vendor.value || "",
          dateOnReceipt: parsed.fields.date.value || "",
          amount: parsed.fields.amount.value || 0,
          inferredCategory,
          scanCompletedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log("OCR " + receiptId + ": status=" + parsed.status + " conf=" + parsed.overallConfidence.toFixed(2));
      return null;
    } catch (err) {
      console.error("scanReceipt error:", err);
      await docRef.set(
        {
          ocrStatus: "failed",
          ocrError: String(err.message || err),
          scanCompletedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return null;
    }
  }
);

function parseReceipt(annotation) {
  const fullText = annotation.text || "";
  const lines = fullText.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);

  const allWords = [];
  for (const page of annotation.pages || []) {
    for (const block of page.blocks || []) {
      for (const para of block.paragraphs || []) {
        for (const word of para.words || []) {
          const wordText = (word.symbols || []).map(function (s) { return s.text; }).join("");
          allWords.push({ text: wordText, confidence: word.confidence || 0 });
        }
      }
    }
  }
  const overallConfidence =
    allWords.length > 0
      ? allWords.reduce(function (s, w) { return s + w.confidence; }, 0) / allWords.length
      : 0;

  // Vendor — top-of-receipt line (skip dates/amounts/short lines)
  let vendorLine = "";
  for (const line of lines.slice(0, 4)) {
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(line)) continue;
    if (/^\$?\d+(?:,\d{3})*\.\d{2}$/.test(line)) continue;
    if (line.length < 3) continue;
    vendorLine = line;
    break;
  }
  if (!vendorLine && lines.length > 0) vendorLine = lines[0];
  const vendor = { value: vendorLine, confidence: vendorLine ? 0.6 : 0 };

  // Date — first match of common formats
  const dateRegexes = [
    /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12][0-9]|3[01])[\/\-](20\d{2})\b/,
    /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12][0-9]|3[01])[\/\-](\d{2})\b/,
    /\b(20\d{2})[\/\-](0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12][0-9]|3[01])\b/,
  ];
  let dateValue = "";
  for (const re of dateRegexes) {
    const m = fullText.match(re);
    if (m) { dateValue = normalizeDate(m[0]); break; }
  }
  const date = { value: dateValue, confidence: dateValue ? 0.92 : 0 };

  // Amount — find a TOTAL/BALANCE line. Critically: SKIP "SUBTOTAL" lines so we
  // don't pick the pre-tax amount. Walk from the end of the receipt back to the
  // top so a final total at the bottom wins over earlier mentions.
  let amountValue = 0;
  let amountConfidence = 0;
  const subtotalRe = /sub[\s\-]*total|sub[\s\-]*ttl/i;
  const totalKeywords = /\b(total|amount\s*due|grand\s*total|balance\s*due|amount\s*paid|purchase\s*total|card\s*total|charge\s*total|total\s*charge|to\s*pay|you\s*pay|amount)\b/i;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (subtotalRe.test(line)) continue; // skip subtotal lines
    if (!totalKeywords.test(line)) continue;
    const candidates = [line, lines[i + 1] || ""];
    for (const c of candidates) {
      const m = c.match(/\$?\s*(\d+(?:,\d{3})*\.\d{2})/);
      if (m) {
        amountValue = parseFloat(m[1].replace(/,/g, ""));
        amountConfidence = 0.95;
        break;
      }
    }
    if (amountValue) break;
  }
  if (!amountValue) {
    // No keyword hit — fall back to the LAST dollar amount on the receipt
    // (totals usually appear near the bottom) but lower confidence so the UI
    // forces the user to verify.
    const matches = fullText.match(/\$?\s*\d+(?:,\d{3})*\.\d{2}/g) || [];
    if (matches.length > 0) {
      amountValue = parseFloat(matches[matches.length - 1].replace(/[^0-9.]/g, ""));
      amountConfidence = 0.5; // forces needs_review
    }
  }

  // --- EZPass / toll-statement override ---
  // Toll statements list each toll as a separate row with a negative amount
  // (deduction from a prepaid balance). The standard TOTAL parser typically
  // picks up the running balance or a credit — neither is what the employee
  // needs reimbursed. Strategy:
  //   1. If we can find an explicit "Total Tolls" line, use that.
  //   2. Otherwise, sum every negative amount on the statement (each toll).
  const isEzpass = /\b(e-?zpass|ezpass|i-?pass|sunpass|fastrak|fasttrak|toll[\s-]*by[\s-]*plate)\b/i.test((vendorLine || "") + " " + fullText);
  if (isEzpass) {
    // Sum every negative amount line by line, but SKIP any line that contains
    // a total/balance/summary keyword. Otherwise the bottom "Total Tolls" line
    // (which is itself a negative number representing the sum) gets added on
    // top of each individual toll, doubling the result.
    const summaryRe = /\b(total|balance|sub[\s-]*total|grand|summary|amount\s*due|amount\s*charged|amount\s*deducted|new\s*balance|opening|closing|previous|forward|deposit|payment\s*received|auto[\s-]*replenish|adjustment)\b/i;
    const negPattern = /-\s*\$?\s*(\d+(?:,\d{3})*\.\d{2})|\(\s*\$?\s*(\d+(?:,\d{3})*\.\d{2})\s*\)/g;
    let summed = 0;
    let count = 0;
    for (const line of lines) {
      if (summaryRe.test(line)) continue;
      let m;
      negPattern.lastIndex = 0;
      while ((m = negPattern.exec(line)) !== null) {
        const num = parseFloat(((m[1] || m[2]) || "0").replace(/,/g, ""));
        if (Number.isFinite(num) && num > 0) { summed += num; count++; }
      }
    }
    if (count > 0) {
      amountValue = Math.round(summed * 100) / 100;
      // Always force review for EZPass — the employee should eyeball the sum
      // against the statement before submitting.
      amountConfidence = 0.6;
    }
  }

  // --- Cross-check: gallons * $/gal must equal total for fuel receipts ---
  const math = gasMathCheck(fullText, amountValue);
  if (math.applicable) {
    if (math.matches) {
      amountConfidence = Math.max(amountConfidence, 0.97);
    } else {
      amountConfidence = 0.4;
    }
  }

  const amount = { value: amountValue, confidence: amountConfidence, mathCheck: math };

  const allFieldsFound = vendor.value && date.value && amount.value > 0;
  const meetsOverallBar = overallConfidence >= 0.7;
  const amountTrusted = amountConfidence >= 0.9;
  const mathConflict = math.applicable && !math.matches;
  const status = allFieldsFound && meetsOverallBar && amountTrusted && !mathConflict
    ? "ok"
    : "needs_review";

  return { overallConfidence: overallConfidence, fields: { vendor: vendor, date: date, amount: amount }, status: status };
}

function gasMathCheck(fullText, total) {
  const t = fullText.replace(/\s+/g, " ");
  const patterns = [
    /gal(?:lons)?\s+(\d+\.\d{2,3})\s*[@xX]\s*\$?\s*(\d+\.\d{2,3})/i,
    /(\d+\.\d{2,3})\s*gal(?:lons)?\s*[@xX]\s*\$?\s*(\d+\.\d{2,3})/i,
    /qty\s+(\d+\.\d{2,3}).{0,20}?price\s+\$?\s*(\d+\.\d{2,3})/i,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) {
      const gallons = parseFloat(m[1]);
      const pricePerGallon = parseFloat(m[2]);
      if (!Number.isFinite(gallons) || !Number.isFinite(pricePerGallon)) continue;
      const expected = Math.round(gallons * pricePerGallon * 100) / 100;
      const matches = total > 0 && Math.abs(expected - total) <= 0.5;
      return {
        applicable: true,
        gallons: gallons,
        pricePerGallon: pricePerGallon,
        expectedTotal: expected,
        ocrTotal: total,
        matches: matches,
        explanation: matches
          ? "Total $" + total.toFixed(2) + " matches " + gallons + " gal x $" + pricePerGallon + "/gal = $" + expected.toFixed(2) + "."
          : "Math conflict: " + gallons + " gal x $" + pricePerGallon + "/gal should equal $" + expected.toFixed(2) + ", but OCR read total as $" + total.toFixed(2) + ". Vision likely misread digits.",
      };
    }
  }
  return { applicable: false };
}

// Guess the expense category from the vendor name and surrounding text.
// Returns one of the five expense types or "Miscellaneous Expenses" as a safe fallback.
function categoryFor(vendor, fullText) {
  const haystack = ((vendor || "") + " " + (fullText || "")).toLowerCase();
  // Gas stations
  if (/\b(shell|exxon|mobil|chevron|bp|sunoco|gulf|valero|marathon|speedway|wawa|sheetz|76 station|conoco|phillips 66|arco|texaco|citgo|gas|fuel|unleaded|diesel|gallons?\b|pump\s*#)\b/.test(haystack)) {
    return "Gas/Fuel";
  }
  // EV charging
  if (/\b(tesla|supercharger|electrify america|chargepoint|evgo|ev-go|blink charging|shell recharge|kwh|charging session|level\s*2\s*charge)\b/.test(haystack)) {
    return "Electric Vehicle Charging";
  }
  // Tolls
  if (/\b(e-?zpass|i-?pass|fastpass|fast lane|sunpass|toll|turnpike|tunnel|bridge fare)\b/.test(haystack)) {
    return "Tolls";
  }
  // Meals / team outings — common restaurant chains + generic restaurant keywords
  if (/\b(restaurant|cafe|café|diner|bar\s*&\s*grill|pizzeria|deli|bistro|chipotle|panera|starbucks|dunkin|mcdonald|wendy|burger king|taco bell|subway|chick-fil-a|popeyes|five guys|olive garden|applebee|chili|cheesecake factory|outback|tgi friday|server|gratuity|tip)\b/.test(haystack)) {
    return "Team Outings/Meals";
  }
  return "Miscellaneous Expenses";
}

function normalizeDate(raw) {
  const s = raw.replace(/-/g, "/");
  const parts = s.split("/");
  if (parts.length !== 3) return raw;
  let a = parts[0], b = parts[1], c = parts[2];
  if (a.length === 4) {
    return a + "-" + b.padStart(2, "0") + "-" + c.padStart(2, "0");
  }
  const year = c.length === 2 ? "20" + c : c;
  return year + "-" + a.padStart(2, "0") + "-" + b.padStart(2, "0");
}
