import { ChevronDown, ChevronRight, Calendar, User, AlertTriangle, FileText, CreditCard, MapPin } from "lucide-react";

import { useState } from 'react';

function App() {
    
  const T = {
    bg: "#0A0D10",
    surface: "#11151A", 
    border: "#1E2530",
    accent: "#F0A830",
    green: "#2DD4A8",
    red: "#F87171",
    text: "#E8EDF3",
    muted: "#8B95A3",
    dim: "#4A5568",
  };
  const mono = "'JetBrains Mono', monospace";
  const sans = "'Outfit', sans-serif";

  const [activeView, setActiveView] = useState('pending');
  const [selectedReport, setSelectedReport] = useState(null);

  const pendingExpenses = [
    {
      id: 1,
      employee: "Sarah Johnson",
      submitted: "2024-01-15",
      total: 247.83,
      receipts: 8,
      violations: 0,
      items: [
        { date: "2024-01-03", vendor: "Shell Station", category: "Gas/Fuel", amount: 45.20, method: "Company Card" },
        { date: "2024-01-05", vendor: "EZPass", category: "Tolls", amount: 12.50, method: "Personal" },
        { date: "2024-01-08", vendor: "Mobil", category: "Gas/Fuel", amount: 52.80, method: "Company Card" },
        { date: "2024-01-10", vendor: "ChargePoint", category: "EV Charging", amount: 28.40, method: "Company Card" },
        { date: "2024-01-12", vendor: "Gulf Station", category: "Gas/Fuel", amount: 38.90, method: "Personal" },
        { date: "2024-01-13", vendor: "Dunkin Donuts", category: "Team Meals", amount: 24.50, method: "Personal" },
        { date: "2024-01-14", vendor: "Sunoco", category: "Gas/Fuel", amount: 41.20, method: "Company Card" },
        { date: "2024-01-15", vendor: "Local Diner", category: "Team Meals", amount: 4.33, method: "Personal" }
      ]
    },
    {
      id: 2,
      employee: "Mike Rodriguez", 
      submitted: "2024-01-14",
      total: 189.45,
      receipts: 6,
      violations: 1,
      items: [
        { date: "2024-01-02", vendor: "BP Station", category: "Gas/Fuel", amount: 48.90, method: "Company Card" },
        { date: "2024-01-04", vendor: "Tesla Supercharger", category: "EV Charging", amount: 35.60, method: "Personal" },
        { date: "2024-01-07", vendor: "Citgo", category: "Gas/Fuel", amount: 43.20, method: "Company Card" },
        { date: "2024-01-09", vendor: "EZPass", category: "Tolls", amount: 18.75, method: "Personal" },
        { date: "2024-01-11", vendor: "Pizza Palace", category: "Team Meals", amount: 67.80, method: "Personal" },
        { date: "2024-01-13", vendor: "Exxon", category: "Gas/Fuel", amount: 15.20, method: "Company Card", violation: "Duplicate receipt detected" }
      ]
    }
  ];

  const recentlyApproved = [
    {
      employee: "Tom Chen",
      approved: "2024-01-12", 
      total: 156.70,
      receipts: 5
    },
    {
      employee: "Lisa Park",
      approved: "2024-01-11",
      total: 203.40, 
      receipts: 7
    }
  ];

  if (selectedReport) {
    const report = pendingExpenses.find(r => r.id === selectedReport);
    return (
      <div style={{ 
        backgroundColor: T.bg, 
        minHeight: '100vh', 
        fontFamily: sans, 
        color: T.text,
        padding: '20px'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '24px' }}>
            <button 
              onClick={() => setSelectedReport(null)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: T.accent,
                fontFamily: sans,
                fontSize: '14px',
                cursor: 'pointer',
                padding: '0',
                marginBottom: '12px'
              }}
            >
              ← Back to Pending Approvals
            </button>
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: '600', 
              margin: '0 0 8px 0' 
            }}>
              {report.employee}'s Expense Report
            </h1>
            <div style={{ color: T.muted, fontSize: '14px' }}>
              Submitted {report.submitted} • {report.receipts} receipts • ${report.total.toFixed(2)} total
            </div>
          </div>

          {/* Violation Warning */}
          {report.violations > 0 && (
            <div style={{
              backgroundColor: T.surface,
              border: `1px solid ${T.red}`,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <AlertTriangle style={{ color: T.red, width: '20px', height: '20px' }} />
              <div>
                <div style={{ fontWeight: '500', color: T.red }}>
                  {report.violations} violation{report.violations > 1 ? 's' : ''} detected
                </div>
                <div style={{ color: T.muted, fontSize: '14px' }}>
                  Please review flagged items before approving
                </div>
              </div>
            </div>
          )}

          {/* Expense Items */}
          <div style={{
            backgroundColor: T.surface,
            borderRadius: '8px',
            border: `1px solid ${T.border}`,
            marginBottom: '24px'
          }}>
            <div style={{ 
              padding: '20px', 
              borderBottom: `1px solid ${T.border}`,
              fontSize: '18px',
              fontWeight: '500'
            }}>
              Expense Items
            </div>
            
            {report.items.map((item, idx) => (
              <div key={idx} style={{
                padding: '16px 20px',
                borderBottom: idx < report.items.length - 1 ? `1px solid ${T.border}` : 'none',
                backgroundColor: item.violation ? `${T.red}08` : 'transparent'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                      {item.vendor}
                    </div>
                    <div style={{ color: T.muted, fontSize: '14px' }}>
                      {item.date} • {item.category} • {item.method}
                    </div>
                  </div>
                  <div style={{ 
                    fontFamily: mono, 
                    fontWeight: '600',
                    color: item.violation ? T.red : T.text
                  }}>
                    ${item.amount.toFixed(2)}
                  </div>
                </div>
                {item.violation && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: T.red,
                    fontSize: '14px',
                    marginTop: '8px'
                  }}>
                    <AlertTriangle style={{ width: '16px', height: '16px' }} />
                    {item.violation}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ 
            display: 'flex', 
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button style={{
              backgroundColor: 'transparent',
              border: `1px solid ${T.border}`,
              color: T.text,
              padding: '12px 24px',
              borderRadius: '6px',
              fontFamily: sans,
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}>
              Request More Info
            </button>
            <button style={{
              backgroundColor: T.red,
              border: 'none',
              color: '#FFFFFF',
              padding: '12px 24px',
              borderRadius: '6px',
              fontFamily: sans,
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}>
              Reject Report
            </button>
            <button style={{
              backgroundColor: T.green,
              border: 'none',
              color: '#FFFFFF',
              padding: '12px 24px',
              borderRadius: '6px',
              fontFamily: sans,
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}>
              Approve All
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: T.bg, 
      minHeight: '100vh', 
      fontFamily: sans, 
      color: T.text,
      padding: '20px'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: '600', 
            margin: '0 0 8px 0' 
          }}>
            Manager Dashboard
          </h1>
          <p style={{ color: T.muted, margin: '0', fontSize: '16px' }}>
            Review and approve your team's expense reports
          </p>
        </div>

        {/* Navigation */}
        <div style={{ 
          display: 'flex', 
          gap: '24px', 
          marginBottom: '32px',
          borderBottom: `1px solid ${T.border}`,
          paddingBottom: '0'
        }}>
          <button 
            onClick={() => setActiveView('pending')}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: activeView === 'pending' ? T.accent : T.muted,
              fontFamily: sans,
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              padding: '12px 0',
              borderBottom: activeView === 'pending' ? `2px solid ${T.accent}` : '2px solid transparent'
            }}
          >
            Pending Approvals (2)
          </button>
          <button 
            onClick={() => setActiveView('approved')}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: activeView === 'approved' ? T.accent : T.muted,
              fontFamily: sans,
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              padding: '12px 0',
              borderBottom: activeView === 'approved' ? `2px solid ${T.accent}` : '2px solid transparent'
            }}
          >
            Recently Approved
          </button>
          <button 
            onClick={() => setActiveView('myexpenses')}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: activeView === 'myexpenses' ? T.accent : T.muted,
              fontFamily: sans,
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              padding: '12px 0',
              borderBottom: activeView === 'myexpenses' ? `2px solid ${T.accent}` : '2px solid transparent'
            }}
          >
            Submit My Expenses
          </button>
        </div>

        {activeView === 'pending' && (
          <div>
            {pendingExpenses.map((report) => (
              <div key={report.id} style={{
                backgroundColor: T.surface,
                borderRadius: '8px',
                border: `1px solid ${T.border}`,
                marginBottom: '16px',
                overflow: 'hidden'
              }}>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ 
                        fontSize: '18px', 
                        fontWeight: '500', 
                        margin: '0 0 8px 0' 
                      }}>
                        {report.employee}
                      </h3>
                      <div style={{ color: T.muted, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar style={{ width: '14px', height: '14px' }} />
                          Submitted {report.submitted}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <FileText style={{ width: '14px', height: '14px' }} />
                          {report.receipts} receipts
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ 
                        fontSize: '20px', 
                        fontWeight: '600', 
                        fontFamily: mono,
                        marginBottom: '4px'
                      }}>
                        ${report.total.toFixed(2)}
                      </div>
                      {report.violations > 0 && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: T.red,
                          fontSize: '12px'
                        }}>
                          <AlertTriangle style={{ width: '12px', height: '12px' }} />
                          {report.violations} violation{report.violations > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setSelectedReport(report.id)}
                    style={{
                      backgroundColor: T.accent,
                      border: 'none',
                      color: '#000000',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      fontFamily: sans,
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    Review Expenses →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeView === 'approved' && (
          <div>
            {recentlyApproved.map((report, idx) => (
              <div key={idx} style={{
                backgroundColor: T.surface,
                borderRadius: '8px',
                border: `1px solid ${T.border}`,
                padding: '20px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ 
                      fontSize: '18px', 
                      fontWeight: '500', 
                      margin: '0 0 8px 0' 
                    }}>
                      {report.employee}
                    </h3>
                    <div style={{ color: T.muted, fontSize: '14px' }}>
                      Approved {report.approved} • {report.receipts} receipts
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <span style={{ 
                      fontSize: '18px', 
                      fontWeight: '600', 
                      fontFamily: mono 
                    }}>
                      ${report.total.toFixed(2)}
                    </span>
                    <span style={{
                      backgroundColor: T.green,
                      color: '#000000',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      Approved
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeView === 'myexpenses' && (
          <div style={{
            backgroundColor: T.surface,
            borderRadius: '8px',
            border: `1px solid ${T.border}`,
            padding: '32px',
            textAlign: 'center'
          }}>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '500', 
              margin: '0 0 16px 0' 
            }}>
              Submit Your Own Expenses
            </h3>
            <p style={{ color: T.muted, margin: '0 0 24px 0' }}>
              Upload your receipts and submit expense reports just like your team members
            </p>
            <button style={{
              backgroundColor: T.accent,
              border: 'none',
              color: '#000000',
              padding: '14px 28px',
              borderRadius: '6px',
              fontFamily: sans,
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer'
            }}>
              Start Expense Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
