export default function ResultCard({ hash, pqSig, ecdsaSig, txHash, ok }) {
  return (
    <div className="mt-6 border p-4 rounded">
      <h2 className="mb-2">{ok ? '✅ Verified' : '❌ Failed'}</h2>
      <p><b>hash</b>: {hash}</p>
      <p><b>PQ sig</b>: {pqSig.slice(0, 32)}…</p>
      <p><b>ECDSA sig</b>: {ecdsaSig.slice(0, 32)}…</p>
      <p><b>tx</b>: {txHash}</p>
    </div>
  );
}
