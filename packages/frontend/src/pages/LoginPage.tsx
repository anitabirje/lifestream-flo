import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/auth-context';
import { Footer } from '../components/Footer';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, signup, error, isLoading, clearError } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!email) {
      setFormError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setFormError('Please enter a valid email');
      return;
    }

    if (!password) {
      setFormError('Password is required');
      return;
    }

    try {
      await login(email, password);
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }
      navigate('/onboarding');
    } catch (err) {
      setFormError(error || 'Login failed');
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!email) {
      setFormError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setFormError('Please enter a valid email');
      return;
    }

    if (!password) {
      setFormError('Password is required');
      return;
    }

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    try {
      await signup(email, password);
      navigate('/verify-email', { state: { email } });
    } catch (err) {
      setFormError(error || 'Signup failed');
    }
  };

  return (
    <div className="login-page">
      <div className="login-left hidden-mobile">
        <div className="auth-left-content">
          <div className="auth-logo">
            <span className="gradient-text">Flo</span>
          </div>
          <h2 className="auth-tagline">Go with the flow of family life</h2>
          <ul className="auth-features">
            <li>
              <span className="feature-icon">✓</span>
              <span>Consolidated calendar view</span>
            </li>
            <li>
              <span className="feature-icon">✓</span>
              <span>Time tracking & analytics</span>
            </li>
            <li>
              <span className="feature-icon">✓</span>
              <span>Intelligent conflict detection</span>
            </li>
            <li>
              <span className="feature-icon">✓</span>
              <span>Proactive time booking</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="login-right">
        <div className="auth-form-container">
          <div className="auth-tabs">
            <button
              className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('login');
                setFormError(null);
                clearError();
              }}
            >
              Login
            </button>
            <button
              className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('signup');
                setFormError(null);
                clearError();
              }}
            >
              Sign Up
            </button>
          </div>

          {activeTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="auth-form">
              <h1 className="auth-title">Welcome Back</h1>

              {(formError || error) && (
                <div className="form-error-message">
                  {formError || error}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="login-email" className="form-label">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="login-password" className="form-label">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="form-checkbox">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                />
                <label htmlFor="remember-me">Remember me</label>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
                style={{ width: '100%' }}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>

              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: '100%', marginTop: 'var(--spacing-lg)' }}
                onClick={() => navigate('/forgot-password')}
              >
                Forgot password?
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignupSubmit} className="auth-form">
              <h1 className="auth-title">Create Account</h1>

              {(formError || error) && (
                <div className="form-error-message">
                  {formError || error}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="signup-email" className="form-label">
                  Email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="signup-password" className="form-label">
                  Password
                </label>
                <input
                  id="signup-password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirm-password" className="form-label">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
                style={{ width: '100%' }}
              >
                {isLoading ? 'Creating account...' : 'Sign Up'}
              </button>
            </form>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};
