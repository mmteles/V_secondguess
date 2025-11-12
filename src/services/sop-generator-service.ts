/**
 * SOP Generator Service Implementation
 * Placeholder for future implementation
 */

import { 
  SOPGenerator, 
  SOPTemplate, 
  RiskAssessment, 
  QualityCheckpoint,
  SectionContentType
} from '@/interfaces';
import { 
  WorkflowDefinition, 
  SOPDocument, 
  SOPType, 
  ValidationResult, 
  SOPChanges,
  SectionType,
  SOPStatus,
  RiskLevel,
  CheckpointMethod,
  CheckpointFrequency,
  StepType,
  SOPSection,
  SOPMetadata,
  DependencyType,
  ValidationError,
  ValidationWarning,
  ValidationErrorType,
  ErrorSeverity
} from '@/models';

export class SOPGeneratorService implements SOPGenerator {
  /**
   * Customize template based on workflow characteristics
   */
  customizeTemplate(template: SOPTemplate, workflow: WorkflowDefinition): SOPTemplate {
    const customizedTemplate: SOPTemplate = {
      ...template,
      sections: [...template.sections]
    };

    // Add workflow-specific sections
    this.addWorkflowSpecificSections(customizedTemplate, workflow);
    
    // Adjust section requirements based on workflow complexity
    this.adjustSectionRequirements(customizedTemplate, workflow);
    
    // Reorder sections based on workflow characteristics
    this.optimizeSectionOrder(customizedTemplate, workflow);

    return customizedTemplate;
  }

  private addWorkflowSpecificSections(template: SOPTemplate, workflow: WorkflowDefinition): void {
    // Add risk management section if workflow has identified risks
    if (workflow.risks && workflow.risks.length > 0) {
      const riskSection = {
        id: 'risk-management',
        title: 'Risk Management',
        required: true,
        order: template.sections.length + 1,
        contentType: SectionContentType.RISK_MATRIX
      };
      
      if (!template.sections.find(s => s.id === 'risk-management')) {
        template.sections.push(riskSection);
      }
    }

    // Add dependencies section if workflow has complex dependencies
    if (workflow.dependencies && workflow.dependencies.length > 2) {
      const dependenciesSection = {
        id: 'dependencies',
        title: 'Dependencies and Coordination',
        required: true,
        order: 2, // Insert early in the process
        contentType: SectionContentType.TEXT
      };
      
      if (!template.sections.find(s => s.id === 'dependencies')) {
        template.sections.splice(1, 0, dependenciesSection);
        this.reorderSections(template);
      }
    }

    // Add resources section if workflow requires specific resources
    const hasResources = workflow.steps.some(step => step.resources && step.resources.length > 0);
    if (hasResources) {
      const resourcesSection = {
        id: 'resources',
        title: 'Required Resources',
        required: true,
        order: template.sections.length + 1,
        contentType: SectionContentType.CHECKLIST
      };
      
      if (!template.sections.find(s => s.id === 'resources')) {
        template.sections.push(resourcesSection);
      }
    }
  }

  private adjustSectionRequirements(template: SOPTemplate, workflow: WorkflowDefinition): void {
    const complexity = workflow.metadata.complexity;
    
    template.sections.forEach(section => {
      // Make more sections required for high complexity workflows
      if (complexity === 'high' || complexity === 'very_high') {
        if (section.id === 'maintenance' || section.id === 'continuous-improvement' || section.id === 'resources') {
          section.required = true;
        }
      }
      
      // Make fewer sections required for low complexity workflows
      if (complexity === 'low') {
        if (section.id === 'maintenance' || section.id === 'continuous-improvement') {
          section.required = false;
        }
      }
    });
  }

  private optimizeSectionOrder(template: SOPTemplate, workflow: WorkflowDefinition): void {
    // For training SOPs, move assessment earlier if workflow has validation steps
    if (template.type === SOPType.TRAINING) {
      const hasValidationSteps = workflow.steps.some(step => 
        step.qualityChecks && step.qualityChecks.length > 0
      );
      
      if (hasValidationSteps) {
        const assessmentSection = template.sections.find(s => s.id === 'assessment');
        if (assessmentSection) {
          assessmentSection.order = 5; // Move before resources
        }
      }
    }

    // For automation SOPs, prioritize error handling if workflow has error conditions
    if (template.type === SOPType.AUTOMATION) {
      const hasErrorHandling = workflow.steps.some(step =>
        step.instructions.some(instruction =>
          instruction.toLowerCase().includes('error') ||
          instruction.toLowerCase().includes('exception') ||
          instruction.toLowerCase().includes('failure')
        )
      );
      
      if (hasErrorHandling) {
        const errorSection = template.sections.find(s => s.id === 'error-handling');
        if (errorSection) {
          errorSection.order = 5; // Move up in priority
        }
      }
    }

    this.reorderSections(template);
  }

  private reorderSections(template: SOPTemplate): void {
    template.sections.sort((a, b) => a.order - b.order);
    
    // Reassign order numbers to ensure consistency
    template.sections.forEach((section, index) => {
      section.order = index + 1;
    });
  }
  async generateSOP(workflow: WorkflowDefinition, type: SOPType): Promise<SOPDocument> {
    // Select and customize template
    const baseTemplate = this.selectTemplate(workflow);
    const customizedTemplate = this.customizeTemplate(baseTemplate, workflow);
    
    // Generate SOP document structure
    const sopDocument: SOPDocument = {
      id: `sop-${workflow.id}-${Date.now()}`,
      title: `SOP: ${workflow.title}`,
      type,
      sections: await this.generateSections(customizedTemplate, workflow),
      charts: [], // Will be populated by Visual Generator
      metadata: this.generateMetadata(workflow),
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Generate risk assessments
    const risks = await this.generateRiskAssessment(workflow);
    
    // Add risk management section if risks exist
    if (risks.length > 0) {
      const riskSection = await this.generateRiskManagementSection(risks);
      sopDocument.sections.push(riskSection);
    }

    // Generate quality checkpoints for all sections
    for (const section of sopDocument.sections) {
      if (section.type === SectionType.STEPS || section.type === SectionType.CHECKLIST) {
        section.checkpoints = await this.generateSectionCheckpoints(section, workflow);
      }
    }

    // Sort sections by order
    sopDocument.sections.sort((a, b) => a.order - b.order);

    return sopDocument;
  }

  private async generateSections(template: SOPTemplate, workflow: WorkflowDefinition): Promise<SOPSection[]> {
    const sections: SOPSection[] = [];

    for (const templateSection of template.sections) {
      const section = await this.generateSectionFromTemplate(templateSection, workflow);
      sections.push(section);
    }

    return sections;
  }

  private async generateSectionFromTemplate(templateSection: any, workflow: WorkflowDefinition): Promise<SOPSection> {
    const section: SOPSection = {
      id: templateSection.id,
      title: templateSection.title,
      content: '',
      type: this.mapContentTypeToSectionType(templateSection.contentType),
      order: templateSection.order,
      charts: [],
      checkpoints: []
    };

    // Generate content based on section type
    switch (templateSection.id) {
      case 'overview':
        section.content = this.generateOverviewContent(workflow);
        break;
      case 'prerequisites':
        section.content = this.generatePrerequisitesContent(workflow);
        break;
      case 'steps':
      case 'execution-steps':
      case 'training-steps':
      case 'improved-process':
        section.content = this.generateStepsContent(workflow);
        break;
      case 'automation-setup':
        section.content = this.generateAutomationSetupContent(workflow);
        break;
      case 'monitoring':
        section.content = this.generateMonitoringContent(workflow);
        break;
      case 'error-handling':
        section.content = this.generateErrorHandlingContent(workflow);
        break;
      case 'learning-objectives':
        section.content = this.generateLearningObjectivesContent(workflow);
        break;
      case 'assessment':
        section.content = this.generateAssessmentContent(workflow);
        break;
      case 'current-state':
        section.content = this.generateCurrentStateContent(workflow);
        break;
      case 'improvement-objectives':
        section.content = this.generateImprovementObjectivesContent(workflow);
        break;
      case 'implementation-plan':
        section.content = this.generateImplementationPlanContent(workflow);
        break;
      case 'measurement':
        section.content = this.generateMeasurementContent(workflow);
        break;
      case 'dependencies':
        section.content = this.generateDependenciesContent(workflow);
        break;
      case 'resources':
        section.content = this.generateResourcesContent(workflow);
        break;
      case 'risk-management':
        // Content will be replaced when risk section is generated separately
        section.content = this.generateGenericContent(templateSection, workflow);
        break;
      default:
        section.content = this.generateGenericContent(templateSection, workflow);
    }

    return section;
  }

  private generateOverviewContent(workflow: WorkflowDefinition): string {
    return `## Purpose
${workflow.description}

## Scope
This SOP covers the complete ${workflow.title} process, including all steps, prerequisites, and quality checkpoints.

## Applicability
This procedure applies to: ${workflow.metadata.requiredSkills.join(', ')}

## Process Summary
${workflow.steps.length} main steps are involved in this process, with an estimated duration of ${workflow.metadata.estimatedDuration.value} ${workflow.metadata.estimatedDuration.unit}.`;
  }

  private generatePrerequisitesContent(workflow: WorkflowDefinition): string {
    const prerequisites = workflow.steps
      .flatMap(step => step.prerequisites)
      .filter((prereq, index, arr) => arr.indexOf(prereq) === index);

    const inputs = workflow.inputs
      .filter(input => input.required)
      .map(input => `- ${input.name}: ${input.description}`);

    return `## Required Prerequisites
${prerequisites.map(prereq => `- ${prereq}`).join('\n')}

## Required Inputs
${inputs.join('\n')}

## Required Skills
${workflow.metadata.requiredSkills.map(skill => `- ${skill}`).join('\n')}`;
  }

  private generateStepsContent(workflow: WorkflowDefinition): string {
    return workflow.steps
      .sort((a, b) => a.order - b.order)
      .map(step => {
        const stepContent = `## Step ${step.order}: ${step.title}

**Description:** ${step.description}

**Instructions:**
${step.instructions.map(instruction => `- ${instruction}`).join('\n')}

**Expected Inputs:** ${step.inputs.join(', ')}
**Expected Outputs:** ${step.outputs.join(', ')}

${step.duration ? `**Estimated Duration:** ${step.duration.value} ${step.duration.unit}` : ''}

${step.resources && step.resources.length > 0 ? 
  `**Required Resources:**\n${step.resources.map(resource => `- ${resource.name} (${resource.type})`).join('\n')}` : ''}`;

        return stepContent;
      }).join('\n\n---\n\n');
  }

  private generateAutomationSetupContent(workflow: WorkflowDefinition): string {
    const automatedSteps = workflow.steps.filter(step => step.type === StepType.AUTOMATED);
    
    return `## System Configuration

Before executing the automated workflow, ensure the following systems are properly configured:

${automatedSteps.map(step => 
  `### ${step.title} Configuration
- System requirements: ${step.prerequisites.join(', ')}
- Configuration steps: ${step.instructions.join(', ')}`
).join('\n\n')}

## Automation Triggers
${workflow.dependencies
  .filter(dep => dep.type === 'timing')
  .map(dep => `- ${dep.description}`)
  .join('\n')}`;
  }

  private generateMonitoringContent(workflow: WorkflowDefinition): string {
    const outputs = workflow.outputs.map(output => 
      `- **${output.name}**: ${output.description}
  - Quality Criteria: ${output.qualityCriteria?.join(', ') || 'Standard quality checks'}`
    ).join('\n');

    return `## Output Monitoring

Monitor the following outputs to ensure process success:

${outputs}

## Success Indicators
- All steps completed without errors
- All required outputs generated
- Quality criteria met for all deliverables`;
  }

  private generateErrorHandlingContent(workflow: WorkflowDefinition): string {
    const errorSteps = workflow.steps.filter(step =>
      step.instructions.some(instruction =>
        instruction.toLowerCase().includes('error') ||
        instruction.toLowerCase().includes('exception') ||
        instruction.toLowerCase().includes('failure')
      )
    );

    return `## Common Error Scenarios

${errorSteps.length > 0 ? 
  errorSteps.map(step => 
    `### ${step.title} Errors
${step.instructions
  .filter(instruction => 
    instruction.toLowerCase().includes('error') ||
    instruction.toLowerCase().includes('exception') ||
    instruction.toLowerCase().includes('failure')
  )
  .map(instruction => `- ${instruction}`)
  .join('\n')}`
  ).join('\n\n') :
  '- Process interruption: Resume from last completed step\n- Data validation failure: Verify inputs and retry\n- System unavailability: Wait for system recovery and retry'
}

## Recovery Procedures
1. Identify the point of failure
2. Assess impact on downstream processes
3. Execute appropriate recovery action
4. Validate system state before continuing
5. Document incident for future prevention`;
  }

  private generateLearningObjectivesContent(workflow: WorkflowDefinition): string {
    return `## Learning Objectives

Upon completion of this training, participants will be able to:

${workflow.steps.map((step, index) => 
  `${index + 1}. Execute ${step.title} according to established procedures`
).join('\n')}

## Competency Requirements
${workflow.metadata.requiredSkills.map(skill => `- Demonstrate proficiency in ${skill}`).join('\n')}

## Performance Standards
- Complete all steps within estimated timeframe (${workflow.metadata.estimatedDuration.value} ${workflow.metadata.estimatedDuration.unit})
- Achieve quality standards for all outputs
- Follow safety and compliance requirements`;
  }

  private generateAssessmentContent(workflow: WorkflowDefinition): string {
    return `## Knowledge Assessment

### Practical Assessment
Participants must successfully complete the following:

${workflow.steps.map((step, index) => 
  `${index + 1}. Demonstrate ${step.title} with supervisor observation`
).join('\n')}

### Quality Criteria
${workflow.outputs.map(output => 
  `- ${output.name}: ${output.qualityCriteria?.join(', ') || 'Meets standard requirements'}`
).join('\n')}

### Certification Requirements
- Pass practical assessment with 100% accuracy
- Complete all training modules
- Demonstrate understanding of safety requirements`;
  }

  private generateCurrentStateContent(workflow: WorkflowDefinition): string {
    return `## Current Process Analysis

**Current Process:** ${workflow.description}

**Current Performance Metrics:**
- Process Duration: ${workflow.metadata.estimatedDuration.value} ${workflow.metadata.estimatedDuration.unit}
- Complexity Level: ${workflow.metadata.complexity}
- Resource Requirements: ${workflow.steps.flatMap(s => s.resources || []).length} resources

**Identified Issues:**
- Areas requiring improvement will be documented based on process analysis
- Bottlenecks and inefficiencies to be addressed
- Quality issues and their root causes`;
  }

  private generateImprovementObjectivesContent(workflow: WorkflowDefinition): string {
    return `## Improvement Objectives

### Primary Objectives
- Reduce process duration by targeting efficiency improvements
- Improve output quality through enhanced quality controls
- Reduce resource requirements where possible

### Success Metrics
${workflow.outputs.map(output => 
  `- ${output.name}: ${output.qualityCriteria?.join(', ') || 'Improved quality standards'}`
).join('\n')}

### Target Improvements
- Process efficiency: Target 20% reduction in execution time
- Quality improvement: Achieve 99% accuracy rate
- Resource optimization: Reduce resource requirements by 15%`;
  }

  private generateImplementationPlanContent(workflow: WorkflowDefinition): string {
    return `## Implementation Strategy

### Phase 1: Preparation
- Stakeholder communication and training
- Resource allocation and setup
- System configuration updates

### Phase 2: Pilot Implementation
${workflow.steps.slice(0, Math.ceil(workflow.steps.length / 2)).map((step, index) => 
  `${index + 1}. Implement ${step.title} improvements`
).join('\n')}

### Phase 3: Full Rollout
${workflow.steps.slice(Math.ceil(workflow.steps.length / 2)).map((step, index) => 
  `${index + Math.ceil(workflow.steps.length / 2) + 1}. Implement ${step.title} improvements`
).join('\n')}

### Phase 4: Monitoring and Adjustment
- Monitor performance metrics
- Collect feedback and adjust procedures
- Document lessons learned`;
  }

  private generateMeasurementContent(workflow: WorkflowDefinition): string {
    return `## Performance Measurement Framework

### Key Performance Indicators (KPIs)
${workflow.outputs.map(output => 
  `- **${output.name}**: ${output.description}
  - Measurement: ${output.qualityCriteria?.join(', ') || 'Quality and timeliness metrics'}`
).join('\n')}

### Measurement Frequency
- Real-time monitoring for critical processes
- Daily reporting for operational metrics
- Weekly analysis for trend identification
- Monthly review for strategic adjustments

### Reporting Structure
- Operational reports: Daily to process owners
- Management reports: Weekly to department heads
- Executive reports: Monthly to senior leadership`;
  }

  private generateDependenciesContent(workflow: WorkflowDefinition): string {
    return `## Process Dependencies

### Internal Dependencies
${workflow.dependencies
  .filter(dep => dep.type === DependencyType.PREREQUISITE || dep.type === DependencyType.DATA)
  .map(dep => `- **${dep.source} → ${dep.target}**: ${dep.description}`)
  .join('\n')}

### External Dependencies
${workflow.dependencies
  .filter(dep => dep.type === DependencyType.RESOURCE || dep.type === DependencyType.APPROVAL)
  .map(dep => `- **${dep.source}**: ${dep.description}`)
  .join('\n')}

### Coordination Requirements
- Ensure all prerequisite processes are completed
- Coordinate timing with dependent processes
- Maintain communication with stakeholders`;
  }

  private generateResourcesContent(workflow: WorkflowDefinition): string {
    const allResources = workflow.steps.flatMap(step => step.resources || []);
    const resourcesByType = allResources.reduce((acc, resource) => {
      if (!acc[resource.type]) acc[resource.type] = [];
      acc[resource.type]!.push(resource);
      return acc;
    }, {} as Record<string, any[]>);

    return Object.entries(resourcesByType)
      .map(([type, resources]) => 
        `### ${type.charAt(0).toUpperCase() + type.slice(1)} Resources
${resources.map(resource => 
  `- **${resource.name}**: ${resource.description || 'Required for process execution'}${resource.quantity ? ` (Quantity: ${resource.quantity})` : ''}`
).join('\n')}`
      ).join('\n\n');
  }

  private generateGenericContent(templateSection: any, workflow: WorkflowDefinition): string {
    return `## ${templateSection.title}

This section provides information about ${templateSection.title.toLowerCase()} for the ${workflow.title} process.

Content will be customized based on specific workflow requirements and organizational needs.`;
  }

  private async generateRiskManagementSection(risks: RiskAssessment[]): Promise<SOPSection> {
    const riskContent = `## Risk Assessment Matrix

${risks.map(risk => 
  `### ${risk.description}
- **Probability**: ${risk.probability}
- **Impact**: ${risk.impact}
- **Owner**: ${risk.owner}
- **Mitigation Strategies**:
${risk.mitigation.map(strategy => `  - ${strategy}`).join('\n')}`
).join('\n\n')}

## Risk Monitoring
- Regular assessment of risk factors
- Implementation of mitigation strategies
- Escalation procedures for high-risk scenarios`;

    return {
      id: 'risk-management',
      title: 'Risk Management',
      content: riskContent,
      type: SectionType.RISK_ASSESSMENT,
      order: 999, // Will be reordered later
      charts: [],
      checkpoints: []
    };
  }

  private generateMetadata(workflow: WorkflowDefinition): SOPMetadata {
    return {
      author: workflow.metadata.author,
      department: workflow.metadata.category,
      effectiveDate: new Date(),
      reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      version: '1.0.0',
      status: SOPStatus.DRAFT,
      tags: [...workflow.metadata.tags, 'generated', 'ai-voice-sop'],
      category: workflow.metadata.category,
      audience: workflow.metadata.requiredSkills,
      purpose: `Standard Operating Procedure for ${workflow.title}`,
      scope: `Covers the complete ${workflow.title} process including all steps, prerequisites, and quality requirements`,
      references: []
    };
  }

  private mapContentTypeToSectionType(contentType: SectionContentType): SectionType {
    switch (contentType) {
      case SectionContentType.TEXT:
        return SectionType.OVERVIEW;
      case SectionContentType.STEPS:
        return SectionType.STEPS;
      case SectionContentType.CHECKLIST:
        return SectionType.CHECKLIST;
      case SectionContentType.CHART:
        return SectionType.DIAGRAM;
      case SectionContentType.RISK_MATRIX:
        return SectionType.RISK_ASSESSMENT;
      default:
        return SectionType.OVERVIEW;
    }
  }

  validateSOPCompleteness(sop: SOPDocument): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    // Validate basic document structure
    if (!sop.id || sop.id.trim() === '') {
      errors.push({
        id: 'missing-id',
        type: ValidationErrorType.MISSING_FIELD,
        field: 'id',
        message: 'SOP document must have a valid ID',
        severity: ErrorSeverity.HIGH,
        code: 'MISSING_SOP_ID'
      });
    }

    if (!sop.title || sop.title.trim() === '') {
      errors.push({
        id: 'missing-title',
        type: ValidationErrorType.MISSING_FIELD,
        field: 'title',
        message: 'SOP document must have a title',
        severity: ErrorSeverity.HIGH,
        code: 'MISSING_SOP_TITLE'
      });
    }

    if (!sop.sections || sop.sections.length === 0) {
      errors.push({
        id: 'missing-sections',
        type: ValidationErrorType.MISSING_FIELD,
        field: 'sections',
        message: 'SOP document must have at least one section',
        severity: ErrorSeverity.CRITICAL,
        code: 'MISSING_SECTIONS'
      });
    }

    // Validate metadata
    if (!sop.metadata) {
      errors.push({
        id: 'missing-metadata',
        type: ValidationErrorType.MISSING_FIELD,
        field: 'metadata',
        message: 'SOP document must have metadata',
        severity: ErrorSeverity.HIGH,
        code: 'MISSING_METADATA'
      });
    } else {
      if (!sop.metadata.author || sop.metadata.author.trim() === '') {
        warnings.push({
          id: 'missing-author',
          field: 'metadata.author',
          message: 'SOP should have an author specified',
          code: 'MISSING_AUTHOR'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      score: Math.max(0, 100 - (errors.length * 20) - (warnings.length * 5))
    };
  }

  async updateSOP(sop: SOPDocument, changes: SOPChanges): Promise<SOPDocument> {
    // TODO: Implement SOP update logic
    return {
      ...sop,
      updatedAt: new Date(),
      version: incrementVersion(sop.version)
    };
  }

  getAvailableTemplates(): SOPTemplate[] {
    return [
      this.getAutomationTemplate(),
      this.getProcessImprovementTemplate(),
      this.getTrainingTemplate()
    ];
  }

  private getAutomationTemplate(): SOPTemplate {
    return {
      id: 'automation',
      name: 'Automation SOP Template',
      type: SOPType.AUTOMATION,
      sections: [
        {
          id: 'overview',
          title: 'Overview',
          required: true,
          order: 1,
          contentType: SectionContentType.TEXT
        },
        {
          id: 'prerequisites',
          title: 'Prerequisites and System Requirements',
          required: true,
          order: 2,
          contentType: SectionContentType.CHECKLIST
        },
        {
          id: 'automation-setup',
          title: 'Automation Setup and Configuration',
          required: true,
          order: 3,
          contentType: SectionContentType.STEPS
        },
        {
          id: 'execution-steps',
          title: 'Automated Execution Steps',
          required: true,
          order: 4,
          contentType: SectionContentType.STEPS
        },
        {
          id: 'monitoring',
          title: 'Monitoring and Validation',
          required: true,
          order: 5,
          contentType: SectionContentType.CHECKLIST
        },
        {
          id: 'error-handling',
          title: 'Error Handling and Recovery',
          required: true,
          order: 6,
          contentType: SectionContentType.STEPS
        },
        {
          id: 'maintenance',
          title: 'Maintenance and Updates',
          required: false,
          order: 7,
          contentType: SectionContentType.TEXT
        }
      ],
      applicableWorkflowTypes: ['automated', 'sequential']
    };
  }

  private getProcessImprovementTemplate(): SOPTemplate {
    return {
      id: 'process-improvement',
      name: 'Process Improvement SOP Template',
      type: SOPType.PROCESS_IMPROVEMENT,
      sections: [
        {
          id: 'overview',
          title: 'Process Overview',
          required: true,
          order: 1,
          contentType: SectionContentType.TEXT
        },
        {
          id: 'current-state',
          title: 'Current State Analysis',
          required: true,
          order: 2,
          contentType: SectionContentType.TEXT
        },
        {
          id: 'improvement-objectives',
          title: 'Improvement Objectives and Metrics',
          required: true,
          order: 3,
          contentType: SectionContentType.CHECKLIST
        },
        {
          id: 'improved-process',
          title: 'Improved Process Steps',
          required: true,
          order: 4,
          contentType: SectionContentType.STEPS
        },
        {
          id: 'implementation-plan',
          title: 'Implementation Plan',
          required: true,
          order: 5,
          contentType: SectionContentType.STEPS
        },
        {
          id: 'measurement',
          title: 'Performance Measurement',
          required: true,
          order: 6,
          contentType: SectionContentType.CHECKLIST
        },
        {
          id: 'continuous-improvement',
          title: 'Continuous Improvement Framework',
          required: false,
          order: 7,
          contentType: SectionContentType.TEXT
        }
      ],
      applicableWorkflowTypes: ['iterative', 'sequential', 'manual']
    };
  }

  private getTrainingTemplate(): SOPTemplate {
    return {
      id: 'training',
      name: 'Training SOP Template',
      type: SOPType.TRAINING,
      sections: [
        {
          id: 'overview',
          title: 'Training Overview',
          required: true,
          order: 1,
          contentType: SectionContentType.TEXT
        },
        {
          id: 'learning-objectives',
          title: 'Learning Objectives',
          required: true,
          order: 2,
          contentType: SectionContentType.CHECKLIST
        },
        {
          id: 'prerequisites',
          title: 'Prerequisites and Required Knowledge',
          required: true,
          order: 3,
          contentType: SectionContentType.CHECKLIST
        },
        {
          id: 'training-steps',
          title: 'Step-by-Step Training Procedure',
          required: true,
          order: 4,
          contentType: SectionContentType.STEPS
        },
        {
          id: 'practice-exercises',
          title: 'Practice Exercises and Examples',
          required: true,
          order: 5,
          contentType: SectionContentType.STEPS
        },
        {
          id: 'assessment',
          title: 'Knowledge Assessment and Validation',
          required: true,
          order: 6,
          contentType: SectionContentType.CHECKLIST
        },
        {
          id: 'resources',
          title: 'Additional Resources and References',
          required: false,
          order: 7,
          contentType: SectionContentType.TEXT
        }
      ],
      applicableWorkflowTypes: ['manual', 'sequential']
    };
  }

  selectTemplate(workflow: WorkflowDefinition): SOPTemplate {
    const templates = this.getAvailableTemplates();
    
    if (templates.length === 0) {
      throw new Error('No SOP templates available');
    }

    // First, try to match by workflow type
    let selectedTemplate = templates.find(template => 
      template.applicableWorkflowTypes.includes(workflow.type)
    );

    // If no direct match, use heuristics based on workflow characteristics
    if (!selectedTemplate) {
      selectedTemplate = this.selectTemplateByHeuristics(workflow, templates);
    }

    // Fallback to first available template
    return selectedTemplate || templates[0]!;
  }

  private selectTemplateByHeuristics(workflow: WorkflowDefinition, templates: SOPTemplate[]): SOPTemplate | undefined {
    // Check for training indicators first (more specific)
    const hasTrainingKeywords = this.containsTrainingKeywords(workflow);
    const hasLearningObjectives = workflow.steps.some(step =>
      step.instructions.some(instruction =>
        instruction.toLowerCase().includes('learn') ||
        instruction.toLowerCase().includes('practice') ||
        instruction.toLowerCase().includes('understand')
      )
    );

    if (hasTrainingKeywords || hasLearningObjectives) {
      return templates.find(t => t.type === SOPType.TRAINING);
    }

    // Check for automation indicators
    const hasAutomationKeywords = this.containsAutomationKeywords(workflow);
    const hasSystemSteps = workflow.steps.some(step => 
      step.type === StepType.AUTOMATED || 
      step.instructions.some(instruction => 
        instruction.toLowerCase().includes('system') || 
        instruction.toLowerCase().includes('automated')
      )
    );

    if (hasAutomationKeywords || hasSystemSteps) {
      return templates.find(t => t.type === SOPType.AUTOMATION);
    }

    // Check for process improvement indicators
    const hasImprovementKeywords = this.containsImprovementKeywords(workflow);
    const hasMetrics = workflow.outputs.some(output =>
      output.qualityCriteria && output.qualityCriteria.length > 0
    );

    if (hasImprovementKeywords || hasMetrics) {
      return templates.find(t => t.type === SOPType.PROCESS_IMPROVEMENT);
    }

    return undefined;
  }

  private containsAutomationKeywords(workflow: WorkflowDefinition): boolean {
    const automationKeywords = [
      'automate', 'automation', 'script', 'system', 'api', 'integration',
      'scheduled', 'trigger', 'batch', 'pipeline', 'workflow engine'
    ];
    
    const searchText = `${workflow.title} ${workflow.description}`.toLowerCase();
    return automationKeywords.some(keyword => searchText.includes(keyword));
  }

  private containsTrainingKeywords(workflow: WorkflowDefinition): boolean {
    const trainingKeywords = [
      'training', 'learn', 'teach', 'education', 'skill', 'knowledge',
      'onboarding', 'certification', 'competency', 'assessment', 'practice',
      'employee'
    ];
    
    const searchText = `${workflow.title} ${workflow.description}`.toLowerCase();
    return trainingKeywords.some(keyword => searchText.includes(keyword));
  }

  private containsImprovementKeywords(workflow: WorkflowDefinition): boolean {
    const improvementKeywords = [
      'improve', 'optimization', 'efficiency', 'streamline', 'enhance',
      'reduce', 'eliminate', 'faster', 'better', 'performance'
    ];
    
    const searchText = `${workflow.title} ${workflow.description}`.toLowerCase();
    return improvementKeywords.some(keyword => searchText.includes(keyword));
  }

  async generateRiskAssessment(workflow: WorkflowDefinition): Promise<RiskAssessment[]> {
    const risks: RiskAssessment[] = [];

    // Include existing workflow risks
    if (workflow.risks && workflow.risks.length > 0) {
      risks.push(...workflow.risks);
    }

    // Generate additional risks based on workflow analysis
    const generatedRisks = this.analyzeWorkflowRisks(workflow);
    risks.push(...generatedRisks);

    // Remove duplicates and prioritize
    const uniqueRisks = this.deduplicateRisks(risks);
    return this.prioritizeRisks(uniqueRisks);
  }

  private analyzeWorkflowRisks(workflow: WorkflowDefinition): RiskAssessment[] {
    const risks: RiskAssessment[] = [];

    // Analyze complexity-based risks
    if (workflow.metadata.complexity === 'high' || workflow.metadata.complexity === 'very_high') {
      risks.push({
        id: `complexity-risk-${Date.now()}`,
        description: 'High process complexity may lead to execution errors',
        probability: RiskLevel.MEDIUM,
        impact: RiskLevel.HIGH,
        mitigation: [
          'Provide comprehensive training to all operators',
          'Implement step-by-step validation checkpoints',
          'Create detailed documentation and reference materials'
        ],
        owner: 'Process Manager'
      });
    }

    // Analyze dependency-based risks
    if (workflow.dependencies.length > 3) {
      risks.push({
        id: `dependency-risk-${Date.now()}`,
        description: 'Multiple dependencies may cause delays or failures',
        probability: RiskLevel.MEDIUM,
        impact: RiskLevel.MEDIUM,
        mitigation: [
          'Establish clear communication protocols with dependency owners',
          'Create contingency plans for critical dependencies',
          'Monitor dependency status regularly'
        ],
        owner: 'Process Coordinator'
      });
    }

    // Analyze automation-specific risks
    const automatedSteps = workflow.steps.filter(step => step.type === StepType.AUTOMATED);
    if (automatedSteps.length > 0) {
      risks.push({
        id: `automation-risk-${Date.now()}`,
        description: 'Automated systems may fail or produce unexpected results',
        probability: RiskLevel.LOW,
        impact: RiskLevel.HIGH,
        mitigation: [
          'Implement comprehensive monitoring and alerting',
          'Create manual fallback procedures',
          'Regular testing and validation of automated systems',
          'Maintain system backups and recovery procedures'
        ],
        owner: 'System Administrator'
      });
    }

    // Analyze resource-based risks
    const criticalResources = workflow.steps.flatMap(step => step.resources || [])
      .filter(resource => resource.type === 'human' || resource.type === 'equipment');
    
    if (criticalResources.length > 0) {
      risks.push({
        id: `resource-risk-${Date.now()}`,
        description: 'Critical resources may be unavailable when needed',
        probability: RiskLevel.MEDIUM,
        impact: RiskLevel.MEDIUM,
        mitigation: [
          'Maintain resource availability schedules',
          'Identify backup resources and alternatives',
          'Implement resource booking and allocation system'
        ],
        owner: 'Resource Manager'
      });
    }

    // Analyze quality-based risks
    const qualitySteps = workflow.steps.filter(step => 
      step.qualityChecks && step.qualityChecks.length > 0
    );
    
    if (qualitySteps.length < workflow.steps.length * 0.5) {
      risks.push({
        id: `quality-risk-${Date.now()}`,
        description: 'Insufficient quality controls may result in defective outputs',
        probability: RiskLevel.MEDIUM,
        impact: RiskLevel.HIGH,
        mitigation: [
          'Implement additional quality checkpoints',
          'Define clear quality criteria for each step',
          'Establish quality review processes',
          'Train staff on quality standards'
        ],
        owner: 'Quality Manager'
      });
    }

    // Analyze timing-based risks
    if (workflow.metadata.estimatedDuration.value > 8 && workflow.metadata.estimatedDuration.unit === 'hours') {
      risks.push({
        id: `timing-risk-${Date.now()}`,
        description: 'Long process duration increases risk of interruption and errors',
        probability: RiskLevel.MEDIUM,
        impact: RiskLevel.MEDIUM,
        mitigation: [
          'Break process into smaller, manageable phases',
          'Implement progress checkpoints and save points',
          'Plan for process interruption and resumption',
          'Allocate buffer time for unexpected delays'
        ],
        owner: 'Process Owner'
      });
    }

    return risks;
  }

  private deduplicateRisks(risks: RiskAssessment[]): RiskAssessment[] {
    const seen = new Set<string>();
    return risks.filter(risk => {
      const key = risk.description.toLowerCase().trim();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private prioritizeRisks(risks: RiskAssessment[]): RiskAssessment[] {
    const riskScore = (risk: RiskAssessment): number => {
      const probabilityScore = this.getRiskLevelScore(risk.probability);
      const impactScore = this.getRiskLevelScore(risk.impact);
      return probabilityScore * impactScore;
    };

    return risks.sort((a, b) => riskScore(b) - riskScore(a));
  }

  private getRiskLevelScore(level: RiskLevel): number {
    switch (level) {
      case RiskLevel.LOW: return 1;
      case RiskLevel.MEDIUM: return 2;
      case RiskLevel.HIGH: return 3;
      case RiskLevel.CRITICAL: return 4;
      default: return 1;
    }
  }

  async generateQualityCheckpoints(sop: SOPDocument): Promise<QualityCheckpoint[]> {
    const checkpoints: QualityCheckpoint[] = [];

    // Generate checkpoints for each section
    for (const section of sop.sections) {
      const sectionCheckpoints = await this.generateSectionCheckpoints(section, null);
      checkpoints.push(...sectionCheckpoints);
    }

    return checkpoints;
  }

  private async generateSectionCheckpoints(section: SOPSection, workflow: WorkflowDefinition | null): Promise<QualityCheckpoint[]> {
    const checkpoints: QualityCheckpoint[] = [];

    switch (section.type) {
      case SectionType.STEPS:
        checkpoints.push(...this.generateStepCheckpoints(section, workflow));
        break;
      case SectionType.CHECKLIST:
        checkpoints.push(...this.generateChecklistCheckpoints(section));
        break;
      case SectionType.RISK_ASSESSMENT:
        checkpoints.push(...this.generateRiskCheckpoints(section));
        break;
      case SectionType.OVERVIEW:
        checkpoints.push(...this.generateOverviewCheckpoints(section));
        break;
      default:
        checkpoints.push(...this.generateGenericCheckpoints(section));
    }

    return checkpoints;
  }

  private generateStepCheckpoints(section: SOPSection, workflow: WorkflowDefinition | null): QualityCheckpoint[] {
    const checkpoints: QualityCheckpoint[] = [];

    // Parse steps from content and generate checkpoints
    const stepMatches = section.content.match(/## Step \d+: (.+?)(?=## Step \d+:|$)/gs);
    
    if (stepMatches) {
      stepMatches.forEach((stepContent: string, index: number) => {
        const stepNumber = index + 1;
        const stepId = `${section.id}-step-${stepNumber}`;
        
        // Extract step title
        const titleMatch = stepContent.match(/## Step \d+: (.+)/);
        const stepTitle = titleMatch ? titleMatch[1] : `Step ${stepNumber}`;

        // Generate completion checkpoint
        checkpoints.push({
          id: `${stepId}-completion`,
          stepId: stepId,
          description: `Verify completion of ${stepTitle}`,
          criteria: this.generateStepCompletionCriteria(stepContent),
          method: this.determineCheckpointMethod(stepContent),
          frequency: CheckpointFrequency.EVERY_EXECUTION,
          responsible: this.determineResponsibleParty(stepContent),
          documentation: this.generateDocumentationRequirements(stepContent)
        });

        // Generate quality checkpoint if step has quality requirements
        if (this.hasQualityRequirements(stepContent)) {
          checkpoints.push({
            id: `${stepId}-quality`,
            stepId: stepId,
            description: `Validate quality standards for ${stepTitle}`,
            criteria: this.generateQualityCriteria(stepContent),
            method: CheckpointMethod.DOCUMENTATION_REVIEW,
            frequency: CheckpointFrequency.EVERY_EXECUTION,
            responsible: 'Quality Reviewer',
            documentation: ['Quality checklist', 'Validation report']
          });
        }

        // Generate safety checkpoint if step has safety implications
        if (this.hasSafetyImplications(stepContent)) {
          checkpoints.push({
            id: `${stepId}-safety`,
            stepId: stepId,
            description: `Verify safety compliance for ${stepTitle}`,
            criteria: this.generateSafetyCriteria(stepContent),
            method: CheckpointMethod.VISUAL_INSPECTION,
            frequency: CheckpointFrequency.EVERY_EXECUTION,
            responsible: 'Safety Officer',
            documentation: ['Safety checklist', 'Incident log']
          });
        }
      });
    }

    return checkpoints;
  }

  private generateChecklistCheckpoints(section: SOPSection): QualityCheckpoint[] {
    return [{
      id: `${section.id}-checklist-completion`,
      stepId: section.id,
      description: `Verify all checklist items completed for ${section.title}`,
      criteria: [
        'All checklist items marked as complete',
        'Required documentation attached',
        'Responsible parties have signed off'
      ],
      method: CheckpointMethod.DOCUMENTATION_REVIEW,
      frequency: CheckpointFrequency.EVERY_EXECUTION,
      responsible: 'Process Supervisor',
      documentation: ['Completed checklist', 'Sign-off sheet']
    }];
  }

  private generateRiskCheckpoints(section: SOPSection): QualityCheckpoint[] {
    return [
      {
        id: `${section.id}-risk-assessment`,
        stepId: section.id,
        description: 'Verify risk mitigation measures are in place',
        criteria: [
          'All identified risks have mitigation strategies',
          'Risk owners are assigned and aware',
          'Mitigation measures are implemented',
          'Risk monitoring procedures are active'
        ],
        method: CheckpointMethod.DOCUMENTATION_REVIEW,
        frequency: CheckpointFrequency.PERIODIC,
        responsible: 'Risk Manager',
        documentation: ['Risk register', 'Mitigation status report']
      },
      {
        id: `${section.id}-risk-monitoring`,
        stepId: section.id,
        description: 'Monitor ongoing risk levels during process execution',
        criteria: [
          'Risk indicators are within acceptable levels',
          'No new risks have emerged',
          'Escalation procedures followed if needed'
        ],
        method: CheckpointMethod.SYSTEM_CHECK,
        frequency: CheckpointFrequency.MILESTONE,
        responsible: 'Process Owner',
        documentation: ['Risk monitoring log', 'Escalation records']
      }
    ];
  }

  private generateOverviewCheckpoints(section: SOPSection): QualityCheckpoint[] {
    return [{
      id: `${section.id}-understanding`,
      stepId: section.id,
      description: 'Verify understanding of process overview and requirements',
      criteria: [
        'Process purpose is clearly understood',
        'Scope and applicability confirmed',
        'Prerequisites verified',
        'Success criteria established'
      ],
      method: CheckpointMethod.PEER_REVIEW,
      frequency: CheckpointFrequency.MILESTONE,
      responsible: 'Process Supervisor',
      documentation: ['Understanding confirmation', 'Prerequisites checklist']
    }];
  }

  private generateGenericCheckpoints(section: SOPSection): QualityCheckpoint[] {
    return [{
      id: `${section.id}-completion`,
      stepId: section.id,
      description: `Verify completion of ${section.title} requirements`,
      criteria: [
        'All section requirements met',
        'Documentation complete',
        'Quality standards achieved'
      ],
      method: CheckpointMethod.DOCUMENTATION_REVIEW,
      frequency: CheckpointFrequency.EVERY_EXECUTION,
      responsible: 'Process Owner',
      documentation: ['Section completion log']
    }];
  }

  private generateStepCompletionCriteria(stepContent: string): string[] {
    const criteria: string[] = ['Step execution completed'];

    // Extract outputs from step content
    const outputMatch = stepContent.match(/\*\*Expected Outputs:\*\* (.+)/);
    if (outputMatch && outputMatch[1]) {
      const outputs = outputMatch[1].split(',').map(output => output.trim());
      criteria.push(...outputs.map(output => `${output} generated and validated`));
    }

    // Extract instructions and convert to criteria
    const instructionMatches = stepContent.match(/- (.+)/g);
    if (instructionMatches) {
      const instructions = instructionMatches.slice(0, 3); // Limit to first 3 for brevity
      criteria.push(...instructions.map(instruction => 
        `${instruction.replace('- ', '').trim()} completed successfully`
      ));
    }

    return criteria;
  }

  private generateQualityCriteria(stepContent: string): string[] {
    const criteria: string[] = [];

    // Look for quality-related keywords
    if (stepContent.toLowerCase().includes('quality') || stepContent.toLowerCase().includes('validate')) {
      criteria.push('Quality standards met according to specifications');
    }

    if (stepContent.toLowerCase().includes('accuracy') || stepContent.toLowerCase().includes('correct')) {
      criteria.push('Accuracy requirements satisfied');
    }

    if (stepContent.toLowerCase().includes('complete') || stepContent.toLowerCase().includes('thorough')) {
      criteria.push('Completeness verified');
    }

    // Default quality criteria if none found
    if (criteria.length === 0) {
      criteria.push(
        'Output meets defined quality standards',
        'No defects or errors identified',
        'Specifications and requirements satisfied'
      );
    }

    return criteria;
  }

  private generateSafetyCriteria(stepContent: string): string[] {
    const criteria: string[] = [];

    if (stepContent.toLowerCase().includes('safety') || stepContent.toLowerCase().includes('hazard')) {
      criteria.push('Safety protocols followed');
    }

    if (stepContent.toLowerCase().includes('equipment') || stepContent.toLowerCase().includes('machine')) {
      criteria.push('Equipment safety checks completed');
    }

    if (stepContent.toLowerCase().includes('personnel') || stepContent.toLowerCase().includes('staff')) {
      criteria.push('Personnel safety requirements met');
    }

    // Default safety criteria
    if (criteria.length === 0) {
      criteria.push(
        'No safety incidents occurred',
        'Safety equipment properly used',
        'Emergency procedures accessible'
      );
    }

    return criteria;
  }

  private determineCheckpointMethod(stepContent: string): CheckpointMethod {
    const content = stepContent.toLowerCase();

    if (content.includes('inspect') || content.includes('visual') || content.includes('observe')) {
      return CheckpointMethod.VISUAL_INSPECTION;
    }

    if (content.includes('measure') || content.includes('test') || content.includes('verify')) {
      return CheckpointMethod.MEASUREMENT;
    }

    if (content.includes('document') || content.includes('record') || content.includes('log')) {
      return CheckpointMethod.DOCUMENTATION_REVIEW;
    }

    if (content.includes('system') || content.includes('automated') || content.includes('check')) {
      return CheckpointMethod.SYSTEM_CHECK;
    }

    if (content.includes('review') || content.includes('approve') || content.includes('validate')) {
      return CheckpointMethod.PEER_REVIEW;
    }

    return CheckpointMethod.VISUAL_INSPECTION; // Default
  }

  private determineResponsibleParty(stepContent: string): string {
    const content = stepContent.toLowerCase();

    if (content.includes('supervisor') || content.includes('manager')) {
      return 'Process Supervisor';
    }

    if (content.includes('quality') || content.includes('qa')) {
      return 'Quality Assurance';
    }

    if (content.includes('safety') || content.includes('security')) {
      return 'Safety Officer';
    }

    if (content.includes('technical') || content.includes('specialist')) {
      return 'Technical Specialist';
    }

    return 'Process Executor'; // Default
  }

  private generateDocumentationRequirements(stepContent: string): string[] {
    const requirements: string[] = ['Step completion log'];

    if (stepContent.toLowerCase().includes('quality')) {
      requirements.push('Quality verification record');
    }

    if (stepContent.toLowerCase().includes('safety')) {
      requirements.push('Safety compliance record');
    }

    if (stepContent.toLowerCase().includes('test') || stepContent.toLowerCase().includes('measure')) {
      requirements.push('Test results documentation');
    }

    if (stepContent.toLowerCase().includes('approval') || stepContent.toLowerCase().includes('sign')) {
      requirements.push('Approval signature');
    }

    return requirements;
  }

  private hasQualityRequirements(stepContent: string): boolean {
    const qualityKeywords = ['quality', 'validate', 'verify', 'check', 'inspect', 'test', 'accuracy'];
    return qualityKeywords.some(keyword => stepContent.toLowerCase().includes(keyword));
  }

  private hasSafetyImplications(stepContent: string): boolean {
    const safetyKeywords = ['safety', 'hazard', 'risk', 'danger', 'equipment', 'machine', 'chemical', 'electrical'];
    return safetyKeywords.some(keyword => stepContent.toLowerCase().includes(keyword));
  }

  /**
   * Generate success criteria for the entire SOP
   */
  generateSuccessCriteria(sop: SOPDocument): string[] {
    const criteria: string[] = [];

    // Overall completion criteria
    criteria.push('All SOP sections completed successfully');
    criteria.push('All quality checkpoints passed');
    criteria.push('No critical issues or failures encountered');

    // Type-specific criteria
    switch (sop.type) {
      case SOPType.AUTOMATION:
        criteria.push('Automated systems functioning correctly');
        criteria.push('Error handling procedures validated');
        criteria.push('Monitoring systems operational');
        break;

      case SOPType.TRAINING:
        criteria.push('Learning objectives achieved');
        criteria.push('Assessment criteria met');
        criteria.push('Competency demonstrated');
        break;

      case SOPType.PROCESS_IMPROVEMENT:
        criteria.push('Improvement objectives met');
        criteria.push('Performance metrics improved');
        criteria.push('Implementation plan executed');
        break;
    }

    // Risk-based criteria
    if (sop.sections.some(section => section.type === SectionType.RISK_ASSESSMENT)) {
      criteria.push('Risk mitigation measures implemented');
      criteria.push('Risk levels within acceptable limits');
    }

    // Documentation criteria
    criteria.push('All required documentation completed');
    criteria.push('Stakeholder approvals obtained');
    criteria.push('Process ready for operational use');

    return criteria;
  }

  /**
   * Validate compliance requirements integration
   */
  validateComplianceRequirements(sop: SOPDocument, complianceStandards: string[] = []): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    // Check for required compliance sections
    const requiredSections = ['overview', 'prerequisites', 'steps'];
    for (const required of requiredSections) {
      if (!sop.sections.find(section => section.id === required)) {
        errors.push({
          id: `missing-section-${required}`,
          type: ValidationErrorType.MISSING_FIELD,
          field: 'sections',
          message: `Missing required section: ${required}`,
          severity: ErrorSeverity.HIGH,
          code: 'MISSING_REQUIRED_SECTION'
        });
      }
    }

    // Check for quality checkpoints
    const sectionsWithoutCheckpoints = sop.sections.filter(section => 
      section.checkpoints.length === 0 && section.type === SectionType.STEPS
    );
    
    if (sectionsWithoutCheckpoints.length > 0) {
      warnings.push({
        id: 'missing-checkpoints',
        field: 'checkpoints',
        message: `Sections without quality checkpoints: ${sectionsWithoutCheckpoints.map(s => s.title).join(', ')}`,
        code: 'MISSING_QUALITY_CHECKPOINTS'
      });
    }

    // Check for risk assessment
    if (!sop.sections.find(section => section.type === SectionType.RISK_ASSESSMENT)) {
      suggestions.push('Consider adding risk assessment section for compliance');
    }

    // Check metadata completeness
    if (!sop.metadata.approver) {
      warnings.push({
        id: 'missing-approver',
        field: 'metadata.approver',
        message: 'No approver specified in metadata',
        code: 'MISSING_APPROVER'
      });
    }

    if (sop.metadata.audience.length === 0) {
      warnings.push({
        id: 'missing-audience',
        field: 'metadata.audience',
        message: 'No target audience specified',
        code: 'MISSING_AUDIENCE'
      });
    }

    // Compliance-specific validations
    for (const standard of complianceStandards) {
      if (!sop.metadata.references.find(ref => ref.title.includes(standard))) {
        suggestions.push(`Consider adding reference to ${standard} compliance standard`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      score: Math.max(0, 100 - (errors.length * 20) - (warnings.length * 5))
    };
  }
}

function incrementVersion(version: string): string {
  const parts = version.split('.');
  const patch = parseInt(parts[2] || '0') + 1;
  return `${parts[0]}.${parts[1]}.${patch}`;
}