import { EventEmitter } from 'events';
import { logger } from './logger';
import { Alert } from './system-monitor';

export interface AlertChannel {
  name: string;
  type: 'email' | 'webhook' | 'console' | 'file';
  config: Record<string, any>;
  enabled: boolean;
  levels: Alert['level'][];
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (alert: Alert) => boolean;
  channels: string[];
  enabled: boolean;
  cooldown?: number; // Minutes between same alerts
}

export interface AlertingConfig {
  channels: AlertChannel[];
  rules: AlertRule[];
  defaultChannels: string[];
  enableCooldown: boolean;
  globalCooldown: number; // Minutes
}

/**
 * Alerting system for system monitoring
 */
export class AlertingSystem extends EventEmitter {
  private config: AlertingConfig;
  private lastAlertTimes = new Map<string, Date>();
  private alertCounts = new Map<string, { count: number; lastOccurrence: Date }>();

  constructor(config: AlertingConfig) {
    super();
    this.config = config;
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for different alert channels
   */
  private setupEventHandlers(): void {
    this.on('alert', this.handleAlert.bind(this));
    
    logger.info('Alerting system initialized', {
      channels: this.config.channels.length,
      rules: this.config.rules.length,
      enableCooldown: this.config.enableCooldown
    });
  }

  /**
   * Handle incoming alert
   */
  private async handleAlert(alert: Alert): Promise<void> {
    try {
      // Check cooldown
      if (this.config.enableCooldown && this.isInCooldown(alert)) {
        logger.debug('Alert suppressed due to cooldown', {
          alertId: alert.id,
          message: alert.message
        });
        return;
      }

      // Find matching rules
      const matchingRules = this.config.rules.filter(rule => 
        rule.enabled && rule.condition(alert)
      );

      if (matchingRules.length === 0) {
        // Use default channels
        await this.sendToChannels(alert, this.config.defaultChannels);
      } else {
        // Use rule-specific channels
        const channels = new Set<string>();
        matchingRules.forEach(rule => {
          rule.channels.forEach(channel => channels.add(channel));
        });
        
        await this.sendToChannels(alert, Array.from(channels));
      }

      // Update cooldown tracking
      this.updateCooldownTracking(alert);

    } catch (error) {
      logger.error('Failed to handle alert', {
        alertId: alert.id,
        error: (error as Error).message
      });
    }
  }

  /**
   * Send alert to specified channels
   */
  private async sendToChannels(alert: Alert, channelNames: string[]): Promise<void> {
    const channels = this.config.channels.filter(channel => 
      channelNames.includes(channel.name) && 
      channel.enabled &&
      channel.levels.includes(alert.level)
    );

    const sendPromises = channels.map(channel => this.sendToChannel(alert, channel));
    
    try {
      await Promise.allSettled(sendPromises);
    } catch (error) {
      logger.error('Failed to send alerts to channels', {
        alertId: alert.id,
        error: (error as Error).message
      });
    }
  }

  /**
   * Send alert to individual channel
   */
  private async sendToChannel(alert: Alert, channel: AlertChannel): Promise<void> {
    try {
      switch (channel.type) {
        case 'console':
          await this.sendToConsole(alert, channel);
          break;
        case 'file':
          await this.sendToFile(alert, channel);
          break;
        case 'webhook':
          await this.sendToWebhook(alert, channel);
          break;
        case 'email':
          await this.sendToEmail(alert, channel);
          break;
        default:
          logger.warn('Unknown alert channel type', {
            channelName: channel.name,
            channelType: channel.type
          });
      }

      logger.debug('Alert sent to channel', {
        alertId: alert.id,
        channelName: channel.name,
        channelType: channel.type
      });

    } catch (error) {
      logger.error('Failed to send alert to channel', {
        alertId: alert.id,
        channelName: channel.name,
        error: (error as Error).message
      });
    }
  }

  /**
   * Send alert to console
   */
  private async sendToConsole(alert: Alert, channel: AlertChannel): Promise<void> {
    const timestamp = alert.timestamp.toISOString();
    const levelColors = {
      info: '\x1b[36m',      // Cyan
      warning: '\x1b[33m',   // Yellow
      error: '\x1b[31m',     // Red
      critical: '\x1b[35m'   // Magenta
    };
    
    const color = levelColors[alert.level] || '\x1b[0m';
    const reset = '\x1b[0m';
    
    console.log(`${color}[ALERT ${alert.level.toUpperCase()}] ${timestamp}${reset}`);
    console.log(`${color}Service: ${alert.service || 'system'}${reset}`);
    console.log(`${color}Message: ${alert.message}${reset}`);
    
    if (alert.metadata) {
      console.log(`${color}Metadata: ${JSON.stringify(alert.metadata, null, 2)}${reset}`);
    }
    
    console.log('---');
  }

  /**
   * Send alert to file
   */
  private async sendToFile(alert: Alert, channel: AlertChannel): Promise<void> {
    const fs = await import('fs/promises');
    const path = channel.config.filePath || './alerts.log';
    
    const alertLine = JSON.stringify({
      timestamp: alert.timestamp.toISOString(),
      level: alert.level,
      service: alert.service,
      message: alert.message,
      metadata: alert.metadata
    }) + '\n';
    
    await fs.appendFile(path, alertLine);
  }

  /**
   * Send alert to webhook
   */
  private async sendToWebhook(alert: Alert, channel: AlertChannel): Promise<void> {
    // Use built-in fetch if available (Node 18+), otherwise use node-fetch
    const fetch = globalThis.fetch || (await import('node-fetch')).default;
    
    const payload = {
      alert: {
        id: alert.id,
        level: alert.level,
        message: alert.message,
        service: alert.service,
        timestamp: alert.timestamp.toISOString(),
        metadata: alert.metadata
      },
      system: {
        name: 'AI Voice SOP Agent',
        version: process.env.npm_package_version || '1.0.0'
      }
    };

    const response = await fetch(channel.config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...channel.config.headers
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Send alert via email (placeholder - would need email service integration)
   */
  private async sendToEmail(alert: Alert, channel: AlertChannel): Promise<void> {
    // This would integrate with an email service like SendGrid, AWS SES, etc.
    logger.info('Email alert would be sent', {
      alertId: alert.id,
      recipients: channel.config.recipients,
      subject: `[${alert.level.toUpperCase()}] ${alert.service || 'System'}: ${alert.message}`
    });
    
    // Placeholder implementation
    // In a real implementation, you would:
    // 1. Format the alert as HTML/text email
    // 2. Send via your email service provider
    // 3. Handle delivery failures and retries
  }

  /**
   * Check if alert is in cooldown period
   */
  private isInCooldown(alert: Alert): boolean {
    const alertKey = `${alert.service || 'system'}:${alert.message}`;
    const lastAlertTime = this.lastAlertTimes.get(alertKey);
    
    if (!lastAlertTime) {
      return false;
    }

    const cooldownMs = this.config.globalCooldown * 60 * 1000;
    const timeSinceLastAlert = Date.now() - lastAlertTime.getTime();
    
    return timeSinceLastAlert < cooldownMs;
  }

  /**
   * Update cooldown tracking
   */
  private updateCooldownTracking(alert: Alert): void {
    const alertKey = `${alert.service || 'system'}:${alert.message}`;
    
    this.lastAlertTimes.set(alertKey, new Date());
    
    const currentData = this.alertCounts.get(alertKey) || { count: 0, lastOccurrence: new Date() };
    this.alertCounts.set(alertKey, {
      count: currentData.count + 1,
      lastOccurrence: new Date()
    });
  }

  /**
   * Process alert through the system
   */
  async processAlert(alert: Alert): Promise<void> {
    this.emit('alert', alert);
  }

  /**
   * Add new alert channel
   */
  addChannel(channel: AlertChannel): void {
    this.config.channels.push(channel);
    
    logger.info('Alert channel added', {
      channelName: channel.name,
      channelType: channel.type,
      enabled: channel.enabled
    });
  }

  /**
   * Add new alert rule
   */
  addRule(rule: AlertRule): void {
    this.config.rules.push(rule);
    
    logger.info('Alert rule added', {
      ruleName: rule.name,
      enabled: rule.enabled,
      channels: rule.channels
    });
  }

  /**
   * Process critical system failure
   */
  async processCriticalFailure(failure: {
    type: string;
    component: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    metadata?: Record<string, any>;
  }): Promise<void> {
    const alert: Alert = {
      id: `critical-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      level: failure.severity === 'critical' ? 'critical' : 'error',
      message: `CRITICAL FAILURE: ${failure.description}`,
      timestamp: new Date(),
      service: failure.component,
      resolved: false,
      metadata: {
        failureType: failure.type,
        severity: failure.severity,
        ...failure.metadata
      }
    };

    await this.processAlert(alert);

    // Log critical failure
    logger.error('Critical system failure processed', {
      alertId: alert.id,
      failureType: failure.type,
      component: failure.component,
      severity: failure.severity
    });
  }

  /**
   * Get critical alerts requiring immediate attention
   */
  getCriticalAlerts(): Array<{
    alertKey: string;
    count: number;
    lastOccurrence: Date;
    severity: 'critical' | 'high';
  }> {
    const criticalAlerts: Array<{
      alertKey: string;
      count: number;
      lastOccurrence: Date;
      severity: 'critical' | 'high';
    }> = [];

    for (const [alertKey, alertData] of this.alertCounts) {
      // Determine if this is a critical alert based on frequency and recency
      const isRecent = Date.now() - alertData.lastOccurrence.getTime() < 5 * 60 * 1000; // 5 minutes
      const isFrequent = alertData.count > 5;
      
      if (isRecent && isFrequent) {
        criticalAlerts.push({
          alertKey,
          count: alertData.count,
          lastOccurrence: alertData.lastOccurrence,
          severity: alertData.count > 10 ? 'critical' : 'high'
        });
      }
    }

    return criticalAlerts.sort((a, b) => b.count - a.count);
  }

  /**
   * Get alerting health status
   */
  getAlertingHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    activeChannels: number;
    totalChannels: number;
    recentAlertVolume: number;
    criticalAlertsCount: number;
    issues: string[];
  } {
    const activeChannels = this.config.channels.filter(c => c.enabled).length;
    const totalChannels = this.config.channels.length;
    const criticalAlerts = this.getCriticalAlerts();
    const issues: string[] = [];
    
    // Calculate recent alert volume (last hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentAlertVolume = Array.from(this.alertCounts.values())
      .filter(alertData => alertData.lastOccurrence.getTime() > oneHourAgo)
      .reduce((sum, alertData) => sum + alertData.count, 0);
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    // Check for issues
    if (activeChannels === 0) {
      status = 'unhealthy';
      issues.push('No active alert channels');
    } else if (activeChannels < totalChannels * 0.5) {
      status = 'degraded';
      issues.push('Less than 50% of alert channels are active');
    }
    
    if (criticalAlerts.length > 0) {
      status = status === 'unhealthy' ? 'unhealthy' : 'degraded';
      issues.push(`${criticalAlerts.length} critical alert patterns detected`);
    }
    
    if (recentAlertVolume > 50) {
      status = status === 'unhealthy' ? 'unhealthy' : 'degraded';
      issues.push('High alert volume detected');
    }
    
    return {
      status,
      activeChannels,
      totalChannels,
      recentAlertVolume,
      criticalAlertsCount: criticalAlerts.length,
      issues
    };
  }

  /**
   * Get alerting statistics
   */
  getStatistics(): {
    totalAlerts: number;
    alertsByLevel: Record<Alert['level'], number>;
    alertsByService: Record<string, number>;
    channelStatus: Array<{ name: string; enabled: boolean; type: string }>;
    healthStatus: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      activeChannels: number;
      totalChannels: number;
      recentAlertVolume: number;
      criticalAlertsCount: number;
      issues: string[];
    };
    criticalAlerts: Array<{
      alertKey: string;
      count: number;
      lastOccurrence: Date;
      severity: 'critical' | 'high';
    }>;
  } {
    const alertsByLevel: Record<Alert['level'], number> = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0
    };

    const alertsByService: Record<string, number> = {};
    let totalAlerts = 0;

    for (const [alertKey, alertData] of this.alertCounts) {
      const service = alertKey.split(':')[0];
      if (service) {
        alertsByService[service] = (alertsByService[service] || 0) + alertData.count;
        totalAlerts += alertData.count;
      }
    }

    const channelStatus = this.config.channels.map(channel => ({
      name: channel.name,
      enabled: channel.enabled,
      type: channel.type
    }));

    return {
      totalAlerts,
      alertsByLevel,
      alertsByService,
      channelStatus,
      healthStatus: this.getAlertingHealthStatus(),
      criticalAlerts: this.getCriticalAlerts()
    };
  }
}

// Default alerting configuration
export const defaultAlertingConfig: AlertingConfig = {
  channels: [
    {
      name: 'console',
      type: 'console',
      config: {},
      enabled: true,
      levels: ['info', 'warning', 'error', 'critical']
    },
    {
      name: 'file',
      type: 'file',
      config: {
        filePath: './logs/alerts.log'
      },
      enabled: true,
      levels: ['warning', 'error', 'critical']
    },
    {
      name: 'critical-file',
      type: 'file',
      config: {
        filePath: './logs/critical-alerts.log'
      },
      enabled: true,
      levels: ['critical']
    }
  ],
  rules: [
    {
      id: 'critical-system-failures',
      name: 'Critical System Failures',
      condition: (alert) => alert.level === 'critical',
      channels: ['console', 'file', 'critical-file'],
      enabled: true,
      cooldown: 1 // 1 minute for critical alerts
    },
    {
      id: 'service-unavailable',
      name: 'Service Unavailable Alerts',
      condition: (alert) => alert.level === 'error' && alert.message.toLowerCase().includes('unavailable'),
      channels: ['console', 'file'],
      enabled: true,
      cooldown: 5 // 5 minutes
    },
    {
      id: 'high-error-rate',
      name: 'High Error Rate Alerts',
      condition: (alert) => alert.level === 'error' && alert.message.toLowerCase().includes('error rate'),
      channels: ['console', 'file'],
      enabled: true,
      cooldown: 10 // 10 minutes
    },
    {
      id: 'memory-alerts',
      name: 'Memory Usage Alerts',
      condition: (alert) => alert.message.toLowerCase().includes('memory'),
      channels: ['console', 'file'],
      enabled: true,
      cooldown: 15 // 15 minutes
    },
    {
      id: 'conversation-manager-alerts',
      name: 'Conversation Manager Critical Alerts',
      condition: (alert) => alert.service === 'ConversationManager' && (alert.level === 'error' || alert.level === 'critical'),
      channels: ['console', 'file'],
      enabled: true,
      cooldown: 5 // 5 minutes
    },
    {
      id: 'sop-generator-alerts',
      name: 'SOP Generator Critical Alerts',
      condition: (alert) => alert.service === 'SOPGenerator' && (alert.level === 'error' || alert.level === 'critical'),
      channels: ['console', 'file'],
      enabled: true,
      cooldown: 5 // 5 minutes
    },
    {
      id: 'speech-service-alerts',
      name: 'Speech Service Critical Alerts',
      condition: (alert) => (alert.service === 'SpeechToText' || alert.service === 'TextToSpeech') && 
                           (alert.level === 'error' || alert.level === 'critical'),
      channels: ['console', 'file'],
      enabled: true,
      cooldown: 3 // 3 minutes for speech services
    },
    {
      id: 'document-export-alerts',
      name: 'Document Export Alerts',
      condition: (alert) => alert.service === 'DocumentExporter' && alert.level === 'error',
      channels: ['console', 'file'],
      enabled: true,
      cooldown: 10 // 10 minutes
    },
    {
      id: 'performance-degradation',
      name: 'Performance Degradation Alerts',
      condition: (alert) => alert.level === 'warning' && 
                           (alert.message.toLowerCase().includes('slow') || 
                            alert.message.toLowerCase().includes('timeout') ||
                            alert.message.toLowerCase().includes('response time')),
      channels: ['console', 'file'],
      enabled: true,
      cooldown: 20 // 20 minutes
    }
  ],
  defaultChannels: ['console'],
  enableCooldown: true,
  globalCooldown: 5 // 5 minutes
};

// Export singleton instance
export const alertingSystem = new AlertingSystem(defaultAlertingConfig);