import RegisterPQ from './components/RegisterPQ.jsx';
import MessageForm from './components/MessageForm.jsx';
import ResultCard from './components/ResultCard.jsx';
import { useState } from 'react';

export default function App() {
  const [res, setRes] = useState(null);
  return (
    <div className="max-w-xl mx-auto p-6 font-mono">
      <h1 className="text-2xl mb-4">QuantaSeal Hybrid Demo</h1>
      <RegisterPQ />
      <MessageForm onDone={setRes} />
      {res && <ResultCard {...res} />}
    </div>
  );
}
