import { EstimateLineItem, PluginEvents, PluginMessageType, PluginNode } from './types';
import { Parser } from 'json2csv';

figma.showUI(__html__);

function getHighlighter(): FrameNode {
  const highlighter = figma.createFrame();
  highlighter.name = "ESTIMATOR";
  highlighter.fills = [{
    type: 'SOLID',
    color: {
      r: 0.85,
      g: 0.92,
      b: 0.97
    }
  }];
  highlighter.opacity = 0.85;

  return highlighter;
}

function highlightEstimate(id: string, toggle: boolean) {
  const node = figma.currentPage.findOne(node => node.id === id);

  if (!node) {
    return;
  }

  if (!toggle) {
    // lets remove that shit
    const hl = figma.currentPage.findOne(node => node.name === "ESTIMATOR");
    if (hl) {
      hl.remove();
    }
    return;
  }

  const newHighlighter = getHighlighter();
  newHighlighter.resize(node.width, node.height);
  newHighlighter.x = 0;
  newHighlighter.y = 0;

  (node as FrameNode).appendChild(newHighlighter);
}

function openEstimate(id: string) {
  const node = figma.currentPage.findOne(node => node.id === id);
  if (node) {
    figma.currentPage.selection = [node];
    highlightEstimate(id, false);
  }
}

function getAllEstimates() {
  const nodes = figma.currentPage.findAll(node => node.type === "FRAME");
  const estimates = [];
  nodes.forEach((node: FrameNode) => {
    const data: EstimateLineItem[] = JSON.parse(node.getPluginData('estimator') || '[]');
    if (data.length) {
      estimates.push({
        id: node.id,
        name: node.name,
        total: data.reduce((acc: number, item: EstimateLineItem) => {
          return acc + Number(item.value);
        }, 0)
      });
    }
  });

  figma.ui.postMessage({ type: PluginMessageType.SetEstimates, estimates });
}

function exportEstimates() {
  const nodes = figma.currentPage.findAll(node => node.type === "FRAME");
  const estimates = [];

  nodes.forEach((node: FrameNode) => {
    const data: EstimateLineItem[] = JSON.parse(node.getPluginData('estimator') || '[]');
    if (data.length) {
      data.map((item: EstimateLineItem) => {
        estimates.push({
          Frame: node.name,
          Item: item.label,
          Hours: item.value
        })
      });
    }
  });

  try {
    const parser = new Parser();
    const csv = parser.parse(estimates);
    figma.ui.postMessage({ type: PluginMessageType.ExportReady, filename: `${figma.currentPage.name}.csv`, data: csv });
  } catch (error) {

  }
}

function saveEstimate(items: EstimateLineItem[]) {
  const { selection } = figma.currentPage;

  if (!selection.length) {
    figma.ui.postMessage({ type: PluginMessageType.Error, error: 'Error, Must have frame selected' });
    return;
  }

  const node: SceneNode = selection[0];
  node.setPluginData('estimator', JSON.stringify(items));
  figma.currentPage.selection = [];
  figma.notify('Your estimate has been saved!');
  getAllEstimates();
}

function getNodeDetails(node: SceneNode): PluginNode {
  return {
    id: node.id,
    name: node.name,
    data: JSON.parse(node.getPluginData('estimator') || '[]')
  }
}

function selectionListener() {
  const { selection } = figma.currentPage;
  if (selection.length) {
    const node: SceneNode = selection[0];
    if (node.type == "FRAME") {
      //
      figma.ui.postMessage({ type: PluginMessageType.SetNode, node: getNodeDetails(node) });
    } else {
      figma.ui.postMessage({ type: PluginMessageType.SetNode, node: undefined });
    }
  } else {
    figma.ui.postMessage({ type: PluginMessageType.SetNode, node: undefined });
  }

  // clear out deleted nodes
  getAllEstimates();
}

selectionListener();

getAllEstimates();

figma.on('selectionchange', selectionListener)

figma.ui.onmessage = msg => {
  switch (msg.type) {
    case PluginEvents.Save:
      saveEstimate(msg.items);
      break;
    case PluginEvents.Open:
      openEstimate(msg.id);
      break;
    case PluginEvents.Cancel:
      figma.currentPage.selection = [];
      break;
    case PluginEvents.Highlight:
      highlightEstimate(msg.id, msg.toggle);
      break;
    case PluginEvents.ExportEstimates:
      exportEstimates();
      break;
    default:
      break;
  }

  // figma.closePlugin()
}
