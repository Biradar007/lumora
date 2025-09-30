export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Privacy & Safety</h1>
      <p>Lumora respects your privacy. We store anonymous session data and auto-delete conversation logs and analytics after 30 days.</p>
      <ul className="list-disc pl-6 text-gray-700 space-y-1">
        <li>No auto-alerts. Outreach occurs only with your explicit consent.</li>
        <li>No diagnoses or medical advice. For emergencies, call 911 (US) or your local number.</li>
        <li>We aggregate minimal analytics (counts only) without PII.</li>
      </ul>
    </div>
  );
}


