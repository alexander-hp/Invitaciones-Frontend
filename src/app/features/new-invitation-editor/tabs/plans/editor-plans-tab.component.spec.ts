import { CustomTemplateSubmission } from '../../../../core/models';
import { EditorPlansTabComponent } from './editor-plans-tab.component';

describe('EditorPlansTabComponent catalog', () => {
  let component: EditorPlansTabComponent;

  beforeEach(() => {
    component = new EditorPlansTabComponent({} as any, {} as any, {} as any);
  });

  it('filters base templates by name, accent and features', () => {
    component.templateSearch = 'BAUTIZO';
    expect(component.filteredBuiltinTemplates.map(template => template.id)).toEqual(['template-bautizo']);

    component.templateSearch = 'súper lujo';
    expect(component.filteredBuiltinTemplates.some(template => template.id === 'boda-creativa-premium')).toBeTrue();

    component.templateSearch = 'swipe';
    expect(component.filteredBuiltinTemplates.some(template => template.id === 'envelope-cards')).toBeTrue();
  });

  it('filters personal versions without changing the catalog', () => {
    component.customSubmissions = [
      { name: 'Flores de primavera', description: 'Boda floral', sourceTemplateKey: 'classic-vertical' },
      { name: 'Noche dorada', description: 'Gala' }
    ] as CustomTemplateSubmission[];
    component.templateSearch = 'floral';

    expect(component.filteredCustomSubmissions.map(submission => submission.name)).toEqual(['Flores de primavera']);
    expect(component.customSubmissions.length).toBe(2);
  });

  it('shows a readable name for visual and custom designs', () => {
    expect(component.getBuiltinName('visual-builder')).toBe('Diseño del editor visual');
    expect(component.getBuiltinName('custom-html')).toBe('Diseño personalizado');
  });

  it('keeps the preview empty when the invitation has no selected design', () => {
    component.invitation = {
      id: 'invitation-1',
      slug: 'invitacion-sin-diseno',
      content: {}
    } as any;
    component.hasSelectedDesign = false;

    component.updateLivePreviewUrl();

    expect(component.isBuiltinActive('envelope-cards')).toBeFalse();
    expect(component.activeTemplateDisplayName).toBe('Sin diseño seleccionado');
    expect(component.livePreviewUrl).toBeNull();
  });
});
