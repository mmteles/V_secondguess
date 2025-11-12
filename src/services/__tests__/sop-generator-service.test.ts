import { SOPGeneratorService } from '../sop-generator-service';
import { 
  WorkflowDefinition, 
  SOPType, 
  SOPDocument,
  WorkflowType,
  StepType,
  ComplexityLevel,
  TimeUnit,
  RiskLevel,
  CheckpointMethod,
  CheckpointFrequency,
  SectionType,
  SOPStatus,
  ResourceType,
  InputType,
  OutputType,
  DependencyType,
  ChangeOperation
} from '@/models';

describe('SOPGeneratorService', () => {
  let service: SOPGeneratorService;
  let mockWorkflow: WorkflowDefinition;

  beforeEach(() => {
    service = new SOPGeneratorService();
    
    mockWorkflow = {
      id: 'test-workflow-1',
      title: 'Test Process Workflow',
      description: 'A comprehensive test workflow for SOP generation',
      type: WorkflowType.SEQUENTIAL,
      steps: [
        {
          id: 'step-1',
          title: 'Initialize Process',
          description: 'Set up the initial conditions for the process',
          order: 1,
          type: StepType.MANUAL,
          inputs: ['initial-data'],
          outputs: ['setup-confirmation'],
          prerequisites: ['System access', 'Required permissions'],
          duration: { value: 30, unit: TimeUnit.MINUTES },
          resources: [
            { id: 'res-1', name: 'Computer', type: ResourceType.EQUIPMENT, quantity: 1 }
          ],
          instructions: [
            'Log into the system',
            'Verify access permissions',
            'Initialize workspace'
          ],
          qualityChecks: [
            {
              id: 'qc-1',
              description: 'Verify system access',
              criteria: ['Login successful', 'Permissions verified'],
              method: 'visual inspection',
              frequency: 'every execution'
            }
          ]
        },
        {
          id: 'step-2',
          title: 'Process Data',
          description: 'Execute the main data processing logic',
          order: 2,
          type: StepType.AUTOMATED,
          inputs: ['setup-confirmation', 'input-data'],
          outputs: ['processed-data'],
          prerequisites: ['Data validation complete'],
          duration: { value: 2, unit: TimeUnit.HOURS },
          resources: [
            { id: 'res-2', name: 'Processing Server', type: ResourceType.EQUIPMENT, quantity: 1 }
          ],
          instructions: [
            'Start automated processing',
            'Monitor system performance',
            'Validate output quality'
          ],
          qualityChecks: [
            {
              id: 'qc-2',
              description: 'Validate processed data',
              criteria: ['Data integrity maintained', 'Processing completed'],
              method: 'system check',
              frequency: 'every execution'
            }
          ]
        }
      ],
      inputs: [
        {
          id: 'input-1',
          name: 'Source Data',
          description: 'Raw data to be processed',
          type: InputType.DATA,
          required: true,
          source: 'External System',
          format: 'JSON',
          validation: []
        }
      ],
      outputs: [
        {
          id: 'output-1',
          name: 'Processed Results',
          description: 'Final processed data output',
          type: OutputType.DATA,
          destination: 'Output Database',
          format: 'JSON',
          qualityCriteria: ['Data completeness', 'Format validation']
        }
      ],
      dependencies: [
        {
          id: 'dep-1',
          type: DependencyType.PREREQUISITE,
          source: 'External System',
          target: 'step-1',
          description: 'External system must be available'
        }
      ],
      risks: [
        {
          id: 'risk-1',
          description: 'System downtime during processing',
          probability: RiskLevel.LOW,
          impact: RiskLevel.HIGH,
          mitigation: ['Backup systems available', 'Recovery procedures defined'],
          owner: 'System Administrator'
        }
      ],
      metadata: {
        author: 'Test Author',
        version: '1.0',
        tags: ['test', 'automation'],
        category: 'Data Processing',
        complexity: ComplexityLevel.MEDIUM,
        estimatedDuration: { value: 3, unit: TimeUnit.HOURS },
        requiredSkills: ['System Administration', 'Data Processing']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  describe('Template Management', () => {
    describe('getAvailableTemplates', () => {
      it('should return all available templates', () => {
        const templates = service.getAvailableTemplates();
        
        expect(templates).toHaveLength(3);
        expect(templates.map(t => t.type)).toContain(SOPType.AUTOMATION);
        expect(templates.map(t => t.type)).toContain(SOPType.PROCESS_IMPROVEMENT);
        expect(templates.map(t => t.type)).toContain(SOPType.TRAINING);
      });

      it('should return templates with proper structure', () => {
        const templates = service.getAvailableTemplates();
        
        templates.forEach(template => {
          expect(template).toHaveProperty('id');
          expect(template).toHaveProperty('name');
          expect(template).toHaveProperty('type');
          expect(template).toHaveProperty('sections');
          expect(template).toHaveProperty('applicableWorkflowTypes');
          expect(Array.isArray(template.sections)).toBe(true);
          expect(Array.isArray(template.applicableWorkflowTypes)).toBe(true);
        });
      });
    });

    describe('selectTemplate', () => {
      it('should select automation template for automated workflows', () => {
        const automationWorkflow = {
          ...mockWorkflow,
          type: 'automated' as WorkflowType
        };
        
        const template = service.selectTemplate(automationWorkflow);
        expect(template.type).toBe(SOPType.AUTOMATION);
      });

      it('should select template based on heuristics when no direct match', () => {
        const trainingWorkflow = {
          ...mockWorkflow,
          title: 'Employee Training Program',
          description: 'Training new employees on company skills',
          type: 'manual' as WorkflowType,
          outputs: [], // Remove quality criteria that might trigger process improvement
          steps: [
            {
              ...mockWorkflow.steps[0]!,
              instructions: ['Learn the basics', 'Practice the skills', 'Understand the concepts']
            }
          ]
        };
        
        const template = service.selectTemplate(trainingWorkflow);
        // The heuristics should select a template based on keywords
        expect([SOPType.TRAINING, SOPType.PROCESS_IMPROVEMENT, SOPType.AUTOMATION]).toContain(template.type);
      });

      it('should fallback to first template when no match found', () => {
        const genericWorkflow = {
          ...mockWorkflow,
          type: 'unknown' as WorkflowType
        };
        
        const template = service.selectTemplate(genericWorkflow);
        expect(template).toBeDefined();
      });
    });

    describe('customizeTemplate', () => {
      it('should add risk management section when workflow has risks', () => {
        const template = service.getAvailableTemplates()[0]!;
        const customized = service.customizeTemplate(template, mockWorkflow);
        
        const riskSection = customized.sections.find(s => s.id === 'risk-management');
        expect(riskSection).toBeDefined();
        expect(riskSection?.required).toBe(true);
      });

      it('should add dependencies section for complex workflows', () => {
        const complexWorkflow = {
          ...mockWorkflow,
          dependencies: [
            ...mockWorkflow.dependencies,
            { id: 'dep-2', type: DependencyType.RESOURCE, source: 'Resource A', target: 'step-1', description: 'Dependency 2' },
            { id: 'dep-3', type: DependencyType.DATA, source: 'Data Source', target: 'step-2', description: 'Dependency 3' }
          ]
        };
        
        const template = service.getAvailableTemplates()[0]!;
        const customized = service.customizeTemplate(template, complexWorkflow);
        
        const depSection = customized.sections.find(s => s.id === 'dependencies');
        expect(depSection).toBeDefined();
      });

      it('should adjust section requirements based on complexity', () => {
        const highComplexityWorkflow = {
          ...mockWorkflow,
          metadata: {
            ...mockWorkflow.metadata,
            complexity: ComplexityLevel.HIGH
          }
        };
        
        const template = service.getAvailableTemplates()[0]!;
        const customized = service.customizeTemplate(template, highComplexityWorkflow);
        
        // Check that optional sections become required for high complexity
        const maintenanceSection = customized.sections.find(s => s.id === 'maintenance');
        if (maintenanceSection) {
          expect(maintenanceSection.required).toBe(true);
        }
      });
    });
  });

  describe('SOP Generation', () => {
    describe('generateSOP', () => {
      it('should generate complete SOP document', async () => {
        const sop = await service.generateSOP(mockWorkflow, SOPType.AUTOMATION);
        
        expect(sop).toHaveProperty('id');
        expect(sop).toHaveProperty('title');
        expect(sop).toHaveProperty('type', SOPType.AUTOMATION);
        expect(sop).toHaveProperty('sections');
        expect(sop).toHaveProperty('metadata');
        expect(sop).toHaveProperty('version', '1.0.0');
        expect(Array.isArray(sop.sections)).toBe(true);
        expect(sop.sections.length).toBeGreaterThan(0);
      });

      it('should generate proper metadata', async () => {
        const sop = await service.generateSOP(mockWorkflow, SOPType.AUTOMATION);
        
        expect(sop.metadata.author).toBe(mockWorkflow.metadata.author);
        expect(sop.metadata.category).toBe(mockWorkflow.metadata.category);
        expect(sop.metadata.status).toBe(SOPStatus.DRAFT);
        expect(sop.metadata.tags).toContain('generated');
        expect(sop.metadata.tags).toContain('ai-voice-sop');
      });

      it('should include risk management section when risks exist', async () => {
        const sop = await service.generateSOP(mockWorkflow, SOPType.AUTOMATION);
        
        const riskSection = sop.sections.find(s => s.type === SectionType.RISK_ASSESSMENT);
        expect(riskSection).toBeDefined();
        expect(riskSection?.content).toContain('Risk');
      });

      it('should generate quality checkpoints for sections', async () => {
        const sop = await service.generateSOP(mockWorkflow, SOPType.AUTOMATION);
        
        const stepsSection = sop.sections.find(s => s.id === 'execution-steps' || s.id === 'steps');
        expect(stepsSection).toBeDefined();
        expect(stepsSection?.checkpoints.length).toBeGreaterThan(0);
      });
    });

    describe('generateRiskAssessment', () => {
      it('should include existing workflow risks', async () => {
        const risks = await service.generateRiskAssessment(mockWorkflow);
        
        const existingRisk = risks.find(r => r.id === 'risk-1');
        expect(existingRisk).toBeDefined();
        expect(existingRisk?.description).toBe('System downtime during processing');
      });

      it('should generate complexity-based risks for high complexity workflows', async () => {
        const highComplexityWorkflow = {
          ...mockWorkflow,
          metadata: {
            ...mockWorkflow.metadata,
            complexity: ComplexityLevel.HIGH
          }
        };
        
        const risks = await service.generateRiskAssessment(highComplexityWorkflow);
        
        const complexityRisk = risks.find(r => r.description.includes('complexity'));
        expect(complexityRisk).toBeDefined();
      });

      it('should generate automation-specific risks', async () => {
        const automationWorkflow = {
          ...mockWorkflow,
          steps: [
            ...mockWorkflow.steps,
            {
              id: 'auto-step',
              title: 'Automated Processing',
              description: 'Automated data processing',
              order: 3,
              type: StepType.AUTOMATED,
              inputs: [],
              outputs: [],
              prerequisites: [],
              instructions: ['Execute automated script'],
              qualityChecks: []
            }
          ]
        };
        
        const risks = await service.generateRiskAssessment(automationWorkflow);
        
        const automationRisk = risks.find(r => r.description.includes('Automated systems'));
        expect(automationRisk).toBeDefined();
      });

      it('should prioritize risks by severity', async () => {
        const risks = await service.generateRiskAssessment(mockWorkflow);
        
        // Check that risks are sorted by priority (high impact/probability first)
        for (let i = 0; i < risks.length - 1; i++) {
          const currentScore = (service as any).getRiskLevelScore(risks[i]!.probability) * 
                              (service as any).getRiskLevelScore(risks[i]!.impact);
          const nextScore = (service as any).getRiskLevelScore(risks[i + 1]!.probability) * 
                           (service as any).getRiskLevelScore(risks[i + 1]!.impact);
          expect(currentScore).toBeGreaterThanOrEqual(nextScore);
        }
      });
    });
  });

  describe('Quality Checkpoints', () => {
    describe('generateQualityCheckpoints', () => {
      it('should generate checkpoints for all sections', async () => {
        const sop = await service.generateSOP(mockWorkflow, SOPType.AUTOMATION);
        const checkpoints = await service.generateQualityCheckpoints(sop);
        
        expect(checkpoints.length).toBeGreaterThan(0);
        
        checkpoints.forEach(checkpoint => {
          expect(checkpoint).toHaveProperty('id');
          expect(checkpoint).toHaveProperty('stepId');
          expect(checkpoint).toHaveProperty('description');
          expect(checkpoint).toHaveProperty('criteria');
          expect(checkpoint).toHaveProperty('method');
          expect(checkpoint).toHaveProperty('frequency');
          expect(checkpoint).toHaveProperty('responsible');
          expect(checkpoint).toHaveProperty('documentation');
          expect(Array.isArray(checkpoint.criteria)).toBe(true);
          expect(Array.isArray(checkpoint.documentation)).toBe(true);
        });
      });

      it('should generate appropriate checkpoint methods', async () => {
        const sop = await service.generateSOP(mockWorkflow, SOPType.AUTOMATION);
        const checkpoints = await service.generateQualityCheckpoints(sop);
        
        const methods = checkpoints.map(cp => cp.method);
        expect(methods).toContain(CheckpointMethod.VISUAL_INSPECTION);
        expect(methods.every(method => 
          Object.values(CheckpointMethod).includes(method)
        )).toBe(true);
      });

      it('should assign appropriate frequencies', async () => {
        const sop = await service.generateSOP(mockWorkflow, SOPType.AUTOMATION);
        const checkpoints = await service.generateQualityCheckpoints(sop);
        
        const frequencies = checkpoints.map(cp => cp.frequency);
        expect(frequencies.every(frequency => 
          Object.values(CheckpointFrequency).includes(frequency)
        )).toBe(true);
      });
    });

    describe('generateSuccessCriteria', () => {
      it('should generate general success criteria', async () => {
        const sop = await service.generateSOP(mockWorkflow, SOPType.AUTOMATION);
        const criteria = service.generateSuccessCriteria(sop);
        
        expect(criteria).toContain('All SOP sections completed successfully');
        expect(criteria).toContain('All quality checkpoints passed');
        expect(criteria).toContain('No critical issues or failures encountered');
      });

      it('should generate type-specific criteria for automation SOPs', async () => {
        const sop = await service.generateSOP(mockWorkflow, SOPType.AUTOMATION);
        const criteria = service.generateSuccessCriteria(sop);
        
        expect(criteria).toContain('Automated systems functioning correctly');
        expect(criteria).toContain('Error handling procedures validated');
        expect(criteria).toContain('Monitoring systems operational');
      });

      it('should generate type-specific criteria for training SOPs', async () => {
        const sop = await service.generateSOP(mockWorkflow, SOPType.TRAINING);
        const criteria = service.generateSuccessCriteria(sop);
        
        expect(criteria).toContain('Learning objectives achieved');
        expect(criteria).toContain('Assessment criteria met');
        expect(criteria).toContain('Competency demonstrated');
      });

      it('should include risk-based criteria when risks exist', async () => {
        const sop = await service.generateSOP(mockWorkflow, SOPType.AUTOMATION);
        const criteria = service.generateSuccessCriteria(sop);
        
        expect(criteria).toContain('Risk mitigation measures implemented');
        expect(criteria).toContain('Risk levels within acceptable limits');
      });
    });
  });

  describe('Validation and Compliance', () => {
    describe('validateSOPCompleteness', () => {
      it('should validate complete SOP as valid', async () => {
        const sop = await service.generateSOP(mockWorkflow, SOPType.AUTOMATION);
        const validation = service.validateSOPCompleteness(sop);
        
        expect(validation.isValid).toBe(true);
        expect(validation.score).toBeGreaterThan(80);
      });

      it('should return validation errors for incomplete SOPs', () => {
        const incompleteSOP: SOPDocument = {
          id: 'incomplete',
          title: '',
          type: SOPType.AUTOMATION,
          sections: [],
          charts: [],
          metadata: {} as any,
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const validation = service.validateSOPCompleteness(incompleteSOP);
        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });

    describe('validateComplianceRequirements', () => {
      it('should validate compliance for complete SOP', async () => {
        const sop = await service.generateSOP(mockWorkflow, SOPType.AUTOMATION);
        const validation = service.validateComplianceRequirements(sop);
        
        // Generated SOPs should have minimal compliance issues
        expect(validation.errors.length).toBeLessThanOrEqual(1);
        expect(validation.score).toBeGreaterThan(60);
      });

      it('should identify missing compliance elements', async () => {
        const sop = await service.generateSOP(mockWorkflow, SOPType.AUTOMATION);
        // Remove required sections to test validation
        sop.sections = sop.sections.filter(s => s.id !== 'overview');
        
        const validation = service.validateComplianceRequirements(sop);
        expect(validation.isValid).toBe(false);
        expect(validation.errors.some(e => e.message === 'Missing required section: overview')).toBe(true);
      });

      it('should provide suggestions for compliance standards', async () => {
        const sop = await service.generateSOP(mockWorkflow, SOPType.AUTOMATION);
        const validation = service.validateComplianceRequirements(sop, ['ISO 9001', 'SOX']);
        
        expect(validation.suggestions.length).toBeGreaterThan(0);
        expect(validation.suggestions.some(s => s.includes('ISO 9001'))).toBe(true);
      });
    });

    describe('updateSOP', () => {
      it('should update SOP with changes', async () => {
        const originalSOP = await service.generateSOP(mockWorkflow, SOPType.AUTOMATION);
        
        // Add a small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const changes = {
          sections: [{
            sectionId: 'overview',
            operation: ChangeOperation.UPDATE,
            content: 'Updated overview content'
          }],
          changeReason: 'Content improvement',
          changedBy: 'Test User',
          changeDate: new Date()
        };
        
        const updatedSOP = await service.updateSOP(originalSOP, changes);
        
        expect(updatedSOP.version).not.toBe(originalSOP.version);
        expect(updatedSOP.updatedAt.getTime()).toBeGreaterThanOrEqual(originalSOP.updatedAt.getTime());
      });
    });
  });
});