import React from 'react';
import './Testimonials.css';

interface Testimonial {
  id: string;
  avatar: string;
  name: string;
  role: string;
  rating: number;
  text: string;
}

interface TestimonialsProps {
  testimonials?: Testimonial[];
}

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    avatar: 'SJ',
    name: 'Sarah Johnson',
    role: 'Parent of 3',
    rating: 5,
    text: 'Flo has completely transformed how our family manages schedules. We\'re more organized and less stressed than ever before.',
  },
  {
    id: '2',
    avatar: 'MK',
    name: 'Michael Kim',
    role: 'Working Parent',
    rating: 5,
    text: 'The time tracking insights are incredible. I finally understand where my time goes and can make better decisions.',
  },
  {
    id: '3',
    avatar: 'ER',
    name: 'Emily Rodriguez',
    role: 'Family Coordinator',
    rating: 5,
    text: 'The conflict detection feature alone has saved us countless scheduling headaches. Highly recommend Flo!',
  },
];

const renderStars = (rating: number) => {
  return Array.from({ length: 5 }).map((_, i) => (
    <span key={i} className={i < rating ? 'star filled' : 'star'}>
      ★
    </span>
  ));
};

export const Testimonials: React.FC<TestimonialsProps> = ({
  testimonials = DEFAULT_TESTIMONIALS,
}) => {
  return (
    <section id="testimonials" className="testimonials-section">
      <div className="testimonials-container">
        <div className="section-header">
          <h2 className="section-title">What Our Users Say</h2>
          <p className="section-subtitle">
            Join thousands of families who trust Flo to keep them organized
          </p>
        </div>

        <div className="testimonials-grid">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="testimonial-card card">
              <div className="testimonial-rating">
                {renderStars(testimonial.rating)}
              </div>
              <p className="testimonial-text">{testimonial.text}</p>
              <div className="testimonial-author">
                <div className="author-avatar">{testimonial.avatar}</div>
                <div className="author-info">
                  <div className="author-name">{testimonial.name}</div>
                  <div className="author-role">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
