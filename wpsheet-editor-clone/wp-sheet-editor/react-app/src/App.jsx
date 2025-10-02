import React from 'react';
import PostsGrid from './components/PostsGrid';
import './App.css';

function App() {
  return (
    <div className="wse-app">
      <h2>WordPress Posts Editor</h2>
      <PostsGrid />
    </div>
  );
}

export default App;