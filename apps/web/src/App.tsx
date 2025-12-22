import { useState, useEffect } from 'react';
import { greet, type User } from '@shared/core';
import './App.css';

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    // Fetch users from backend
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data.users));

    // Get greeting
    fetch('/api/greet?name=Developer')
      .then(res => res.json())
      .then(data => setGreeting(data.message));
  }, []);

  return (
    <div className="App">
      <h1>{greeting || greet('React')}</h1>
      <h2>Users from Backend:</h2>
      <ul>
        {users.map(user => (
          <li key={user.id}>
            {user.name} - {user.email}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;