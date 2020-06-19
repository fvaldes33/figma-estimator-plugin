export interface EstimateLineItem {
  label: string;
  value: string;
}

export interface Estimate {
  id: string;
  name: string;
  total: number;
}

export enum PluginEvents {
  Save = 'save-estimate',
  Open = 'open-estimate',
  Cancel = 'cancel-estimate',
  Highlight = 'highlight-estimate'
}

export enum PluginMessageType {
  Error = 'error',
  SetNode = 'set-node',
  SetEstimates = 'set-estimates'
}

export type PluginNode = Partial<SceneNode> & { data?: any };
