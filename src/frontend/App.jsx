import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import CarDetail from './CarDetail';

function CarDetailRoute() {
  const { id } = useParams();
  return <CarDetail carId={id} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/cars/:id" element={<CarDetailRoute />} />
      </Routes>
    </BrowserRouter>
  );
}
