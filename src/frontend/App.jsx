import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CarDetail from './CarDetail';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/cars/:id" element={<CarDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
