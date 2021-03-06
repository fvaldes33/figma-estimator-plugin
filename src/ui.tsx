import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Estimate, EstimateLineItem, PluginMessageType, PluginEvents, PluginNode } from './types';
import './css/ui.css';

declare function require(path: string): any

export function download(filename: string, data: string) {
  const a: HTMLAnchorElement = document.createElement('a');
  a.style.display = 'none';
  document.body.appendChild(a);

  const blob: Blob = new Blob([data], { type: 'octet/stream' });
  const url: string = window.URL.createObjectURL(blob);

  a.href = url;
  a.download = filename;

  a.click();

  window.URL.revokeObjectURL(url);

  if (a && a.parentElement) {
    a.parentElement.removeChild(a);
  }
}

const App: React.FC = () => {
  const [items, setItems] = React.useState<EstimateLineItem[]>([]);
  const [error, setError] = React.useState<string>();
  const [node, setNode] = React.useState<PluginNode>();
  const [estimates, setEstimates] = React.useState<Estimate[]>([]);

  onmessage = (event) => {
    const { pluginMessage } = event.data;

    switch (pluginMessage.type) {
      case PluginMessageType.Error:
        setErrorFromParent(pluginMessage.error)
        break;
      case PluginMessageType.SetNode:
        setNode(pluginMessage.node);
        if (pluginMessage.node && pluginMessage.node.data) {
          setItems(pluginMessage.node.data);
        }
        break;
      case PluginMessageType.SetEstimates:
        if (pluginMessage.estimates) {
          setEstimates(pluginMessage.estimates);
        }
        break;
      case PluginMessageType.ExportReady:
        download(pluginMessage.filename, pluginMessage.data);
        break;
      default:
        break;
    }
  }

  const setErrorFromParent = (error: string) => {
    setError(error);

    setTimeout(() => {
      setError(undefined);
    }, 1000);
  }

  const addItem = () => {
    const newItem = {
      label: '',
      value: ''
    };

    setItems((items) => [ ...items, newItem ]);
  }

  const removeItem = (index: number) => {
    setItems((prevItems) => {
      const newItems = prevItems.slice();
      newItems.splice(index, 1);

      return [
        ...newItems
      ];
    })
  }

  const updateItem = (index: number, key: string, value: string) => {
    setItems((prevItems) => {
      const newItems = prevItems.slice();
      newItems[index] = {
        ...newItems[index],
        [key]: value
      }

      return [
        ...newItems
      ];
    })
  }

  const highlight = (id: string, toggle: boolean) => {
    parent.postMessage({ pluginMessage: { type: PluginEvents.Highlight, id, toggle } }, '*');
  }

  const openEstimate = (id: string) => {
    parent.postMessage({ pluginMessage: { type: PluginEvents.Open, id } }, '*');
  }

  const saveEstimate = () => {
    parent.postMessage({ pluginMessage: { type: PluginEvents.Save, items } }, '*');
  }

  const cancel = () => {
    parent.postMessage({ pluginMessage: { type: PluginEvents.Cancel } }, '*');
  }

  const exportEstimates = () => {
    parent.postMessage({ pluginMessage: { type: PluginEvents.ExportEstimates } }, '*');
  }

  return (
    <div className="plugin">
      {node ? (
        <>
          <div className="section-header">
            <label>{node.name}</label>
            <span className="icon" onClick={addItem}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M5.5 5.5V0.5H6.5V5.5H11.5V6.5H6.5V11.5H5.5V6.5H0.5V5.5H5.5Z" fill="black" fillOpacity="0.8" />
              </svg>
            </span>
          </div>
          <ul className="line-items">
            {items.map((item: EstimateLineItem, index: number) => (
              <li key={index}>
                <div className="input-group">
                  <input className="input-group-label" type="text" placeholder="Label" value={item.label} onChange={e => updateItem(index, 'label', e.target.value)} />
                  <input className="input-group-value" type="text" placeholder="10" value={item.value} onChange={e => updateItem(index, 'value', e.target.value)} />
                </div>
                <div className="input-action">
                  <span className="icon" onClick={() => removeItem(index)}>
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M21.5 16.5H10.5V15.5H21.5V16.5Z" fill="black" fillOpacity="0.8" />
                    </svg>
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div className="section-footer">
            <button className="button destructive" onClick={cancel}>
              Cancel
            </button>
            <button className="button" onClick={saveEstimate}>
              Save
            </button>

            {error &&
              <span className="error">
                {error}
              </span>
            }
          </div>
        </>
      ) : (
        <>
          {estimates.length > 0 ? (
            <>
              <ul className="estimates">
                {estimates.map((estimate: Estimate, index: number) => (
                  <li key={index}
                    onClick={() => openEstimate(estimate.id)}
                    onMouseEnter={() => highlight(estimate.id, true)}
                    onMouseLeave={() => highlight(estimate.id, false)}
                  >
                    <span>{estimate.name}</span>
                    <span>{estimate.total}</span>
                  </li>
                ))}
              </ul>
              {estimates.length > 0 &&
                <div className="section-footer">
                  <ul className="estimates totals">
                    <li>
                      <span className="icon" onClick={() => exportEstimates()}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" clipRule="evenodd" d="M8.35355 12.3536L8 12.7071L7.64645 12.3536L4.64645 9.35355L5.35355 8.64645L7.5 10.7929V3H8.5V10.7929L10.6464 8.64645L11.3536 9.35355L8.35355 12.3536ZM15 14V15H1V14H15Z" fill="black" fillOpacity="0.8" />
                        </svg>
                      </span>
                      <div>
                        <span style={{ marginRight: '16px' }}>Total</span>
                        <span>{estimates.reduce((acc: number, estimate: Estimate) => acc + estimate.total, 0)}</span>
                      </div>
                    </li>
                  </ul>
                </div>
              }
            </>
          ) : (
            <div className="empty-state">
              <h2>Select Frame to continue</h2>
            </div>
          )}
        </>
      )}
    </div>
  )
}

ReactDOM.render(<App />, document.getElementById('estimator-plugin'));
