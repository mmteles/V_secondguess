import { Router, Request, Response } from 'express';
import { monitoringIntegration } from '../../utils/monitoring-integration';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * Serve monitoring dashboard HTML
 */
router.get('/', (req: Request, res: Response) => {
  const dashboardHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Voice SOP Agent - Monitoring Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f5f5f5;
            color: #333;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem 2rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 1.5rem;
            font-weight: 600;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .card {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-left: 4px solid #667eea;
        }
        
        .card h2 {
            font-size: 1.1rem;
            margin-bottom: 1rem;
            color: #555;
        }
        
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
        
        .status-healthy { background-color: #10b981; }
        .status-degraded { background-color: #f59e0b; }
        .status-unhealthy { background-color: #ef4444; }
        .status-unknown { background-color: #6b7280; }
        
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .metric:last-child {
            border-bottom: none;
        }
        
        .metric-label {
            font-weight: 500;
            color: #666;
        }
        
        .metric-value {
            font-weight: 600;
            color: #333;
        }
        
        .alert {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            padding: 1rem;
            margin-bottom: 1rem;
        }
        
        .alert-critical {
            background: #fef2f2;
            border-color: #fca5a5;
        }
        
        .alert-error {
            background: #fef2f2;
            border-color: #fca5a5;
        }
        
        .alert-warning {
            background: #fffbeb;
            border-color: #fed7aa;
        }
        
        .alert-info {
            background: #eff6ff;
            border-color: #bfdbfe;
        }
        
        .alert-header {
            font-weight: 600;
            margin-bottom: 0.5rem;
        }
        
        .alert-time {
            font-size: 0.875rem;
            color: #666;
            margin-top: 0.5rem;
        }
        
        .refresh-button {
            background: #667eea;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            margin-bottom: 1rem;
        }
        
        .refresh-button:hover {
            background: #5a67d8;
        }
        
        .loading {
            text-align: center;
            padding: 2rem;
            color: #666;
        }
        
        .component-list {
            list-style: none;
        }
        
        .component-item {
            display: flex;
            align-items: center;
            padding: 0.75rem 0;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .component-item:last-child {
            border-bottom: none;
        }
        
        .component-name {
            flex: 1;
            font-weight: 500;
        }
        
        .auto-refresh {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
        
        .auto-refresh input[type="checkbox"] {
            margin: 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎤 AI Voice SOP Agent - System Monitoring</h1>
    </div>
    
    <div class="container">
        <div class="auto-refresh">
            <input type="checkbox" id="autoRefresh" checked>
            <label for="autoRefresh">Auto-refresh (30s)</label>
            <button class="refresh-button" onclick="loadDashboard()">Refresh Now</button>
        </div>
        
        <div id="dashboard-content" class="loading">
            Loading dashboard data...
        </div>
    </div>

    <script>
        let autoRefreshInterval;
        
        async function loadDashboard() {
            console.log('Loading dashboard...');
            try {
                const response = await fetch('/api/monitoring/dashboard');
                console.log('Response status:', response.status);
                
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status + ': ' + response.statusText);
                }
                
                const data = await response.json();
                console.log('Data received:', data);
                
                renderDashboard(data);
            } catch (error) {
                console.error('Failed to load dashboard:', error);
                document.getElementById('dashboard-content').innerHTML = 
                    '<div class="alert alert-error">Failed to load dashboard data: ' + error.message + '</div>';
            }
        }
        
        function renderDashboard(data) {
            console.log('Rendering dashboard with data:', data);
            const container = document.getElementById('dashboard-content');
            
            if (!container) {
                console.error('Dashboard container not found!');
                return;
            }
            
            // Build service health list
            const serviceHealthItems = Object.entries(data.health.services).map(([name, service]) => 
                '<li class="component-item">' +
                    '<span class="component-name">' + name + '</span>' +
                    '<span class="status-indicator status-' + service.status + '"></span>' +
                    '<span>' + service.status + '</span>' +
                '</li>'
            ).join('');
            
            // Build alerts list
            let alertsHtml = '';
            if (data.health.alerts.length === 0) {
                alertsHtml = '<p style="color: #10b981; font-weight: 500;">✅ No active alerts</p>';
            } else {
                alertsHtml = data.health.alerts.map(alert => 
                    '<div class="alert alert-' + alert.level + '">' +
                        '<div class="alert-header">' +
                            '[' + alert.level.toUpperCase() + '] ' + (alert.service || 'System') + ': ' + alert.message +
                        '</div>' +
                        (alert.metadata ? 
                            '<div style="font-size: 0.875rem; color: #666; margin-top: 0.5rem;">' +
                                JSON.stringify(alert.metadata, null, 2) +
                            '</div>' : '') +
                        '<div class="alert-time">' + new Date(alert.timestamp).toLocaleString() + '</div>' +
                    '</div>'
                ).join('');
            }
            
            const html = 
                '<div class="grid">' +
                    '<div class="card">' +
                        '<h2>System Overview</h2>' +
                        '<div class="metric">' +
                            '<span class="metric-label">Overall Health</span>' +
                            '<span class="metric-value">' +
                                '<span class="status-indicator status-' + data.health.status + '"></span>' +
                                data.health.status.charAt(0).toUpperCase() + data.health.status.slice(1) +
                            '</span>' +
                        '</div>' +
                        '<div class="metric">' +
                            '<span class="metric-label">Uptime</span>' +
                            '<span class="metric-value">' + formatUptime(data.health.uptime) + '</span>' +
                        '</div>' +
                        '<div class="metric">' +
                            '<span class="metric-label">Active Sessions</span>' +
                            '<span class="metric-value">' + data.health.metrics.activeSessions + '</span>' +
                        '</div>' +
                        '<div class="metric">' +
                            '<span class="metric-label">Total Requests</span>' +
                            '<span class="metric-value">' + data.health.metrics.totalRequests.toLocaleString() + '</span>' +
                        '</div>' +
                    '</div>' +
                    
                    '<div class="card">' +
                        '<h2>Performance Metrics</h2>' +
                        '<div class="metric">' +
                            '<span class="metric-label">Avg Response Time</span>' +
                            '<span class="metric-value">' + Math.round(data.health.metrics.averageResponseTime) + 'ms</span>' +
                        '</div>' +
                        '<div class="metric">' +
                            '<span class="metric-label">Error Rate</span>' +
                            '<span class="metric-value">' + (data.health.metrics.errorRate * 100).toFixed(2) + '%</span>' +
                        '</div>' +
                        '<div class="metric">' +
                            '<span class="metric-label">Memory Usage</span>' +
                            '<span class="metric-value">' + ((data.health.metrics.memoryUsage.heapUsed / data.health.metrics.memoryUsage.heapTotal) * 100).toFixed(1) + '%</span>' +
                        '</div>' +
                        '<div class="metric">' +
                            '<span class="metric-label">CPU Usage</span>' +
                            '<span class="metric-value">' + data.health.metrics.cpuUsage.toFixed(1) + '%</span>' +
                        '</div>' +
                    '</div>' +
                    
                    '<div class="card">' +
                        '<h2>Service Health</h2>' +
                        '<ul class="component-list">' +
                            serviceHealthItems +
                        '</ul>' +
                    '</div>' +
                    
                    '<div class="card">' +
                        '<h2>Service Statistics</h2>' +
                        '<div class="metric">' +
                            '<span class="metric-label">Total Services</span>' +
                            '<span class="metric-value">' + data.serviceHealth.totalServices + '</span>' +
                        '</div>' +
                        '<div class="metric">' +
                            '<span class="metric-label">Healthy Services</span>' +
                            '<span class="metric-value">' + data.serviceHealth.healthyServices + '</span>' +
                        '</div>' +
                        '<div class="metric">' +
                            '<span class="metric-label">Degraded Services</span>' +
                            '<span class="metric-value">' + data.serviceHealth.degradedServices + '</span>' +
                        '</div>' +
                        '<div class="metric">' +
                            '<span class="metric-label">Unhealthy Services</span>' +
                            '<span class="metric-value">' + data.serviceHealth.unhealthyServices + '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                
                '<div class="card">' +
                    '<h2>Active Alerts (' + data.health.alerts.length + ')</h2>' +
                    alertsHtml +
                '</div>';
            
            console.log('Setting HTML content...');
            container.innerHTML = html;
            console.log('Dashboard rendered successfully');
        }
        
        function formatUptime(ms) {
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) return \`\${days}d \${hours % 24}h\`;
            if (hours > 0) return \`\${hours}h \${minutes % 60}m\`;
            if (minutes > 0) return \`\${minutes}m \${seconds % 60}s\`;
            return \`\${seconds}s\`;
        }
        
        function setupAutoRefresh() {
            const checkbox = document.getElementById('autoRefresh');
            
            function updateAutoRefresh() {
                if (autoRefreshInterval) {
                    clearInterval(autoRefreshInterval);
                }
                
                if (checkbox.checked) {
                    autoRefreshInterval = setInterval(loadDashboard, 30000);
                }
            }
            
            checkbox.addEventListener('change', updateAutoRefresh);
            updateAutoRefresh();
        }
        
        // Initialize dashboard
        loadDashboard();
        setupAutoRefresh();
    </script>
</body>
</html>
  `;

  res.send(dashboardHTML);
});

export default router;