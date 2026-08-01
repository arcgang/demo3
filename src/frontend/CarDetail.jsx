import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function CarDetail({ carId }) {
  const params = useParams();
  const id = carId !== undefined ? carId : params.id;
  const [car, setCar] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/cars/${id}`)
      .then((res) => {
        if (!res.ok) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setCar(data);
      })
      .catch(() => setNotFound(true));
  }, [id]);

  if (notFound) {
    return <h2>Car not found</h2>;
  }

  if (!car) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <h1>{car.year} {car.make} {car.model}</h1>
      <p>{car.description}</p>
      <div>
        {car.averageRating != null
          ? <span>{car.averageRating.toFixed(1)} / 5</span>
          : null}
        <span>{car.reviewCount} reviews</span>
      </div>
      <button>Write a Review</button>
    </div>
  );
}
