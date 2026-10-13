import { BrowserRouter } from 'react-router-dom';
import { App } from '@jjoin/admin/App';
import '@jjoin/admin/styles.css';

export function AdminEntry() {
  return (
    <BrowserRouter basename="/admin">
      <App />
    </BrowserRouter>
  );
}
