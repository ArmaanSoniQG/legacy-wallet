import { useEffect } from 'react';

export default function Toast({ msg, onDone, ms = 3500 }) {
  useEffect(() => {
    const t = setTimeout(onDone, ms);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed top-4 right-4 bg-black text-white px-4 py-2
                    rounded shadow-lg z-50 text-sm">
      {msg}
    </div>
  );
}
