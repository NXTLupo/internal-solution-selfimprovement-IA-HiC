import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './styles.css'; // Import the CSS

// Method to render within Streamlit
window.renderReactApp = (elementId, props) => {
  ReactDOM.render(
    <React.StrictMode>
      <App {...props} />
    </React.StrictMode>,
    document.getElementById(elementId)
  );
};

// For development outside Streamlit
if (process.env.NODE_ENV === 'development') {
  ReactDOM.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    document.getElementById('root')
  );
}