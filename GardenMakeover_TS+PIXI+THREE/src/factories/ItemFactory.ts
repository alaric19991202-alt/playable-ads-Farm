import type { createTemplateLibrary } from "../systems/templateLibrary";

export class ItemFactory {
  private templateLibrary: ReturnType<typeof createTemplateLibrary>;

  constructor(templateLibrary: ReturnType<typeof createTemplateLibrary>) {
    this.templateLibrary = templateLibrary;
  }

  getTemplate(id: string) {
    return this.templateLibrary.getTemplate(id);
  }

  cloneTemplate(id: string) {
    return this.templateLibrary.cloneTemplate(id);
  }

  getAnimations() {
    return this.templateLibrary.getAllAnimations();
  }
}
