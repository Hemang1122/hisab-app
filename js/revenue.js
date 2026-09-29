// ========== REVENUE DASHBOARD ==========

function showRevenue() {
  let from = document.getElementById('revFrom').value, to = document.getElementById('revTo').value;
  if (!from || !to) return alert('Date range select karo!');
  let filtered = entries.filter(e => e.date >= from && e.date <= to);
  let totalRevenue = 0, totalLabShare = 0, totalDocShare = 0, totalDisc = 0, totalPaid = 0, totalBal = 0;
  let byDoctor = {}, byPayMode = {};
  filtered.forEach(e => {
    let labS = 0, docS = 0;
    e.tests.forEach(t => { labS += t.labShare; docS += t.docShare; });
    totalRevenue += e.total; totalLabShare += labS; totalDocShare += docS;
    totalDisc += e.discount; totalPaid += e.paid; totalBal += e.balance;
    if (!byDoctor[e.doctorName]) byDoctor[e.doctorName] = { revenue: 0, lab: 0, doc: 0, count: 0 };
    byDoctor[e.doctorName].revenue += e.total; byDoctor[e.doctorName].lab += labS;
    byDoctor[e.doctorName].doc += docS; byDoctor[e.doctorName].count++;
    byPayMode[e.paymentMode] = (byPayMode[e.paymentMode] || 0) + e.paid;
  });
  let docRows = Object.entries(byDoctor).map(([n, d]) => '<tr><td>' + n + '</td><td>' + d.count + '</td><td>₹' + d.revenue + '</td><td>₹' + d.lab + '</td><td>₹' + d.doc + '</td></tr>').join('');
  let payRows = Object.entries(byPayMode).map(([m, a]) => '<tr><td>' + m + '</td><td>₹' + a + '</td></tr>').join('');
  document.getElementById('revenueResult').innerHTML = '<div class="card">' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:12px">' +
    '<div style="background:#e8f8f5;padding:10px;border-radius:8px;text-align:center"><small>Total Revenue</small><br><b style="font-size:18px;color:#1a5276">₹' + totalRevenue + '</b></div>' +
    '<div style="background:#eaf2f8;padding:10px;border-radius:8px;text-align:center"><small>Lab Share</small><br><b style="font-size:18px;color:#2980b9">₹' + totalLabShare + '</b></div>' +
    '<div style="background:#e8f8f5;padding:10px;border-radius:8px;text-align:center"><small>Doctor Share</small><br><b style="font-size:18px;color:#27ae60">₹' + totalDocShare + '</b></div>' +
    '<div style="background:#fdedec;padding:10px;border-radius:8px;text-align:center"><small>Discount</small><br><b style="font-size:18px;color:#c0392b">₹' + totalDisc + '</b></div>' +
    '<div style="background:#fef9e7;padding:10px;border-radius:8px;text-align:center"><small>Collected</small><br><b style="font-size:18px;color:#b7950b">₹' + totalPaid + '</b></div>' +
    '<div style="background:#fdedec;padding:10px;border-radius:8px;text-align:center"><small>Balance</small><br><b style="font-size:18px;color:#c0392b">₹' + totalBal + '</b></div>' +
    '</div>' +
    '<h3 style="font-size:14px">Doctor-wise</h3>' +
    '<table><tr><th>Doctor</th><th>Patients</th><th>Revenue</th><th>Lab</th><th>Doctor</th></tr>' + docRows + '</table>' +
    '<h3 style="font-size:14px;margin-top:12px">Payment Mode</h3>' +
    '<table><tr><th>Mode</th><th>Amount</th></tr>' + payRows + '</table></div>';
}
