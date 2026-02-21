import React, { useState } from 'react';
import './CategoryTrackingStep.css';

export const DEFAULT_CATEGORIES = [
  { id: 'work', name: 'Work', icon: '💼', color: '#2196F3' },
  { id: 'family-time', name: 'Family Time', icon: '👨‍👩‍👧‍👦', color: '#FF9800' },
  { id: 'health-fitness', name: 'Health/Fitness', icon: '💪', color: '#4CAF50' },
  { id: 'upskilling', name: 'Upskilling', icon: '📚', color: '#9C27B0' },
  { id: 'relaxation', name: 'Relaxation', icon: '🧘', color: '#00BCD4' }
];

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isCustom?: boolean;
}

export interface CategoryTrackingStepProps {
  enabled: boolean;
  customCategories: string[];
  onUpdate: (enabled: boolean, categories: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export const CategoryTrackingStep: React.FC<CategoryTrackingStepProps> = ({
  enabled,
  customCategories,
  onUpdate,
  onNext,
  onBack
}) => {
  const [trackingEnabled, setTrackingEnabled] = useState(enabled);
  const [categories, setCategories] = useState<Category[]>([
    ...DEFAULT_CATEGORIES,
    ...customCategories.map((name, index) => ({
      id: `custom-${index}`,
      name,
      icon: '📌',
      color: '#607D8B',
      isCustom: true
    }))
  ]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleToggleTracking = (value: boolean) => {
    setTrackingEnabled(value);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      return;
    }

    const newCategory: Category = {
      id: `custom-${Date.now()}`,
      name: newCategoryName.trim(),
      icon: '📌',
      color: '#607D8B',
      isCustom: true
    };

    setCategories([...categories, newCategory]);
    setNewCategoryName('');
  };

  const handleStartEdit = (category: Category) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const handleSaveEdit = () => {
    if (!editingName.trim() || !editingId) {
      return;
    }

    setCategories(categories.map(cat =>
      cat.id === editingId ? { ...cat, name: editingName.trim() } : cat
    ));
    setEditingId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleDeleteCategory = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category?.isCustom) {
      alert('Default categories cannot be deleted');
      return;
    }

    if (confirm(`Are you sure you want to delete "${category.name}"?`)) {
      setCategories(categories.filter(cat => cat.id !== categoryId));
    }
  };

  const handleNext = () => {
    const customCategoryNames = categories
      .filter(cat => cat.isCustom)
      .map(cat => cat.name);
    
    onUpdate(trackingEnabled, customCategoryNames);
    onNext();
  };

  return (
    <div className="category-tracking-step">
      <h2>Activity Categories</h2>
      <p>Customize how you track your time</p>

      <div className="tracking-toggle">
        <h3>Enable Category Tracking?</h3>
        <p>Track time spent across different activity categories</p>
        <div className="toggle-buttons">
          <button
            className={trackingEnabled ? 'active' : ''}
            onClick={() => handleToggleTracking(true)}
          >
            Yes, enable tracking
          </button>
          <button
            className={!trackingEnabled ? 'active' : ''}
            onClick={() => handleToggleTracking(false)}
          >
            No, skip tracking
          </button>
        </div>
      </div>

      {trackingEnabled && (
        <>
          <div className="categories-section">
            <h3>Your Categories</h3>
            <p>Default categories are provided, but you can add or rename them</p>

            <div className="categories-list">
              {categories.map(category => (
                <div key={category.id} className="category-item">
                  <div className="category-info">
                    <span className="category-icon" style={{ backgroundColor: category.color }}>
                      {category.icon}
                    </span>
                    {editingId === category.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                        autoFocus
                        className="category-edit-input"
                      />
                    ) : (
                      <span className="category-name">{category.name}</span>
                    )}
                    {category.isCustom && <span className="custom-badge">Custom</span>}
                  </div>
                  <div className="category-actions">
                    {editingId === category.id ? (
                      <>
                        <button onClick={handleSaveEdit} className="save-btn">✓</button>
                        <button onClick={handleCancelEdit} className="cancel-btn">✕</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleStartEdit(category)} className="edit-btn">
                          ✏️ Rename
                        </button>
                        {category.isCustom && (
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="delete-btn"
                          >
                            🗑️ Delete
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="add-category-section">
            <h3>Add Custom Category</h3>
            <div className="add-category-form">
              <input
                type="text"
                placeholder="Enter category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              />
              <button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                Add Category
              </button>
            </div>
          </div>
        </>
      )}

      {!trackingEnabled && (
        <div className="tracking-disabled-notice">
          <p>
            Category tracking is disabled. You can enable it later in settings if you change your mind.
          </p>
        </div>
      )}

      <div className="step-actions">
        <button onClick={onBack}>Back</button>
        <button onClick={handleNext} className="primary">
          Next
        </button>
      </div>
    </div>
  );
};
