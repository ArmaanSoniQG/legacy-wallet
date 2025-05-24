import { useState } from 'react';
import MessageForm from './components/MessageForm.jsx';
import ResultCard  from './components/ResultCard.jsx';

export default function App() {
  const [result, setResult] = useState(null);
  return (
    <div className="max-w-2xl mx-auto p-6 font-mono">
      <h1 className="text-2xl mb-4">QuantaSeal Hybrid Demo</h1>
      <MessageForm onDone={setResult} />
      {result && <ResultCard {...result} />}
    </div>
  );
}
