// Export Class Results to Excel (.csv format supported directly by Excel)
export const exportToExcel = (filename, headers, rows) => {
  const csvRows = [];
  // Add Header Row
  csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));

  // Add Data Rows
  rows.forEach(row => {
    csvRows.push(row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','));
  });

  const csvContent = '\uFEFF' + csvRows.join('\n'); // UTF-8 BOM for Excel formatting
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Trigger Print for Student or Class Results
export const printElement = () => {
  window.print();
};
