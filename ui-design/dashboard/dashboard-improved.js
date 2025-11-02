/**
 * Sentinel Dashboard - Interactive JavaScript
 * Adds sorting, filtering, and interactive features
 */

(function () {
  'use strict';

  // ============================================
  // TABLE SORTING
  // ============================================

  class TableSorter {
    constructor(table) {
      this.table = table;
      this.tbody = table.querySelector('tbody');
      this.headers = Array.from(table.querySelectorAll('th.sortable'));
      this.currentSort = { column: null, direction: 'asc' };

      this.init();
    }

    init() {
      this.headers.forEach((header, index) => {
        const button = header.querySelector('.th-button');
        if (button) {
          button.addEventListener('click', () => this.sort(index));
        }
      });
    }

    sort(columnIndex) {
      const rows = Array.from(this.tbody.querySelectorAll('tr'));
      const header = this.headers[columnIndex];
      const isNumeric = header.classList.contains('numeric');

      // Determine sort direction
      let direction = 'asc';
      if (this.currentSort.column === columnIndex && this.currentSort.direction === 'asc') {
        direction = 'desc';
      }

      // Sort rows
      rows.sort((a, b) => {
        const aCell = a.cells[columnIndex];
        const bCell = b.cells[columnIndex];

        let aValue = this.getCellValue(aCell, isNumeric);
        let bValue = this.getCellValue(bCell, isNumeric);

        if (aValue === null && bValue === null) return 0;
        if (aValue === null) return 1;
        if (bValue === null) return -1;

        const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return direction === 'asc' ? comparison : -comparison;
      });

      // Update DOM
      rows.forEach(row => this.tbody.appendChild(row));

      // Update UI indicators
      this.updateSortIndicators(columnIndex, direction);

      // Store current sort
      this.currentSort = { column: columnIndex, direction };
    }

    getCellValue(cell, isNumeric) {
      const metricPrimary = cell.querySelector('.metric-primary');
      const scanNumber = cell.querySelector('.scan-number');
      const datePrimary = cell.querySelector('.date-primary');
      const efficiencyValue = cell.querySelector('.efficiency-value');

      let text = '';
      if (metricPrimary) {
        text = metricPrimary.textContent;
      } else if (scanNumber) {
        text = scanNumber.textContent;
      } else if (datePrimary) {
        text = datePrimary.textContent + ' ' + cell.querySelector('.date-secondary').textContent;
      } else if (efficiencyValue) {
        text = efficiencyValue.textContent;
      } else {
        text = cell.textContent;
      }

      text = text.trim();

      if (isNumeric) {
        // Remove non-numeric characters (commas, %, ms, etc.)
        const numStr = text.replace(/[^0-9.-]/g, '');
        const num = parseFloat(numStr);
        return isNaN(num) ? null : num;
      }

      // Handle date parsing
      if (text.includes('Oct') || text.includes('PM') || text.includes('AM')) {
        const date = new Date(text);
        return isNaN(date.getTime()) ? text.toLowerCase() : date.getTime();
      }

      return text.toLowerCase();
    }

    updateSortIndicators(activeColumn, direction) {
      // Reset all headers
      this.headers.forEach((header, index) => {
        const button = header.querySelector('.th-button');
        const icon = header.querySelector('.sort-icon');

        if (index === activeColumn) {
          button.style.color = 'var(--primary-600)';
          icon.style.opacity = '1';
          icon.style.color = 'var(--primary-600)';

          // Rotate icon based on direction
          if (direction === 'desc') {
            icon.style.transform = 'rotate(180deg)';
          } else {
            icon.style.transform = 'rotate(0deg)';
          }
        } else {
          button.style.color = '';
          icon.style.opacity = '';
          icon.style.color = '';
          icon.style.transform = '';
        }
      });
    }
  }

  // ============================================
  // STATUS BANNER DISMISS
  // ============================================

  function initStatusBanner() {
    const statusBanner = document.querySelector('.status-banner');
    const closeButton = statusBanner?.querySelector('.status-close');

    if (closeButton && statusBanner) {
      closeButton.addEventListener('click', () => {
        statusBanner.style.opacity = '0';
        statusBanner.style.transform = 'translateY(-10px)';
        setTimeout(() => {
          statusBanner.style.display = 'none';
        }, 200);
      });
    }
  }

  // ============================================
  // SEARCH KEYBOARD SHORTCUT
  // ============================================

  function initSearchShortcut() {
    const searchInput = document.querySelector('.search-input');

    if (searchInput) {
      document.addEventListener('keydown', (e) => {
        // Cmd+K on Mac, Ctrl+K on Windows/Linux
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          searchInput.focus();
        }

        // Escape to clear/blur
        if (e.key === 'Escape' && document.activeElement === searchInput) {
          searchInput.value = '';
          searchInput.blur();
        }
      });

      // Simple client-side search filter (demo)
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          filterTable(e.target.value.toLowerCase());
        }, 300);
      });
    }
  }

  function filterTable(query) {
    const table = document.querySelector('.data-table');
    const rows = table?.querySelectorAll('tbody tr');

    if (!rows) return;

    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      if (text.includes(query)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });

    // Update pagination info
    const visibleRows = Array.from(rows).filter(row => row.style.display !== 'none').length;
    const paginationInfo = document.querySelector('.pagination-info');
    if (paginationInfo) {
      paginationInfo.innerHTML = `Showing <strong>1-${visibleRows}</strong> of <strong>${rows.length}</strong> scans`;
    }
  }

  // ============================================
  // ROW ACTIONS MENU (PLACEHOLDER)
  // ============================================

  function initRowActions() {
    const actionButtons = document.querySelectorAll('.row-action-button');

    actionButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        // In a real app, this would open a dropdown menu
        console.log('Row action clicked');
        // You could implement a dropdown menu here
      });
    });
  }

  // ============================================
  // ANIMATED NUMBER COUNTERS
  // ============================================

  function animateValue(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16); // 60fps
    let current = start;

    const timer = setInterval(() => {
      current += increment;
      if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
        current = end;
        clearInterval(timer);
      }

      // Format number with commas
      const formatted = Math.round(current).toLocaleString();
      element.textContent = formatted;
    }, 16);
  }

  function initMetricAnimations() {
    const metricValues = document.querySelectorAll('.metric-value');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.animated) {
          const text = entry.target.textContent.trim();
          const numMatch = text.match(/[\d,]+/);

          if (numMatch) {
            const target = parseInt(numMatch[0].replace(/,/g, ''));
            entry.target.textContent = '0';
            animateValue(entry.target, 0, target, 1000);
            entry.target.dataset.animated = 'true';
          }
        }
      });
    }, { threshold: 0.5 });

    metricValues.forEach(element => observer.observe(element));
  }

  // ============================================
  // EFFICIENCY BAR ANIMATION
  // ============================================

  function initEfficiencyBars() {
    const bars = document.querySelectorAll('.efficiency-bar');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.animated) {
          const targetWidth = entry.target.style.width;
          entry.target.style.width = '0%';

          setTimeout(() => {
            entry.target.style.width = targetWidth;
            entry.target.dataset.animated = 'true';
          }, 100);
        }
      });
    }, { threshold: 0.5 });

    bars.forEach(bar => observer.observe(bar));
  }

  // ============================================
  // REFRESH DATA (DEMO)
  // ============================================

  function initRefreshButton() {
    const refreshButton = document.querySelector('.table-action-button[aria-label="Refresh data"]');

    if (refreshButton) {
      refreshButton.addEventListener('click', () => {
        // Animate the button
        refreshButton.style.transform = 'rotate(360deg)';
        refreshButton.style.transition = 'transform 0.6s ease';

        setTimeout(() => {
          refreshButton.style.transform = '';
        }, 600);

        // In a real app, this would fetch new data
        console.log('Refreshing data...');
      });
    }
  }

  // ============================================
  // EXPORT DATA (DEMO)
  // ============================================

  function initExportButton() {
    const exportButton = document.querySelector('.table-action-button[aria-label="Export data"]');

    if (exportButton) {
      exportButton.addEventListener('click', () => {
        console.log('Exporting data...');

        // Simple CSV export demo
        const table = document.querySelector('.data-table');
        const rows = Array.from(table.querySelectorAll('tr'));

        const csv = rows.map(row => {
          const cells = Array.from(row.querySelectorAll('th, td'));
          return cells
            .filter(cell => !cell.classList.contains('actions-col'))
            .map(cell => {
              const text = cell.textContent.trim().replace(/\s+/g, ' ');
              return `"${text}"`;
            })
            .join(',');
        }).join('\n');

        // Create download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scan-performance-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  }

  // ============================================
  // TOOLTIP HELPER
  // ============================================

  function initTooltips() {
    // Add tooltips to percentage changes
    const metricChanges = document.querySelectorAll('.metric-change');

    metricChanges.forEach(change => {
      change.title = 'Compared to previous scan';
    });
  }

  // ============================================
  // RESPONSIVE SIDEBAR TOGGLE (MOBILE)
  // ============================================

  function initMobileSidebar() {
    // This would toggle the sidebar on mobile
    // You'd need to add a hamburger button to the header

    // Placeholder for mobile menu implementation
    if (window.innerWidth <= 768) {
      console.log('Mobile view - sidebar toggle would be implemented here');
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    console.log('Initializing Sentinel Dashboard...');

    // Initialize all features
    const table = document.querySelector('.data-table');
    if (table) {
      new TableSorter(table);
    }

    initStatusBanner();
    initSearchShortcut();
    initRowActions();
    initMetricAnimations();
    initEfficiencyBars();
    initRefreshButton();
    initExportButton();
    initTooltips();
    initMobileSidebar();

    console.log('Dashboard initialized successfully!');
  }

  // Start initialization
  init();

  // ============================================
  // LIVE UPDATES (DEMO)
  // ============================================

  // Simulate live updates every 30 seconds (demo only)
  function simulateLiveUpdates() {
    setInterval(() => {
      const statusBanner = document.querySelector('.status-banner');
      if (statusBanner && statusBanner.style.display !== 'none') {
        const timeElement = statusBanner.querySelector('.status-description');
        if (timeElement) {
          // Update "last scan finished" time
          const currentText = timeElement.textContent;
          const match = currentText.match(/(\d+) minute/);
          if (match) {
            const minutes = parseInt(match[1]) + 1;
            timeElement.textContent = `Last scan finished ${minutes} minutes ago`;
          }
        }
      }
    }, 30000);
  }

  simulateLiveUpdates();

})();
