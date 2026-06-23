import React from 'react';
import './DishCard.css';

function DishCard({ dish, isToggling, onToggle }) {
  return (
    <div className={`dish-card ${!dish.isPublished ? 'unpublished' : ''}`}>
      <div className="dish-img-wrap">
        <img
          src={dish.imageUrl}
          alt={dish.dishName}
          className="dish-img"
          onError={e => {
            e.target.src = `https://placehold.co/400x220/e2e8f0/718096?text=${encodeURIComponent(dish.dishName)}`;
          }}
        />
        <span className={`badge ${dish.isPublished ? 'badge-published' : 'badge-unpublished'}`}>
          {dish.isPublished ? '● Published' : '○ Unpublished'}
        </span>
      </div>

      <div className="dish-body">
        <div className="dish-meta">
          <span className="dish-id">#{dish.dishId}</span>
          <h3 className="dish-name">{dish.dishName}</h3>
        </div>

        <button
          className={`toggle-btn ${dish.isPublished ? 'btn-unpublish' : 'btn-publish'}`}
          onClick={() => onToggle(dish.dishId)}
          disabled={isToggling}
        >
          {isToggling ? (
            <span className="btn-spinner" />
          ) : dish.isPublished ? (
            '⊗ Unpublish'
          ) : (
            '⊕ Publish'
          )}
        </button>
      </div>
    </div>
  );
}

export default DishCard;
