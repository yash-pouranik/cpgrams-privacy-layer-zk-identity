export function ProtectedBanner() {
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-8 flex items-start gap-4">
      <div className="mt-0.5 text-orange-600">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <div>
        <h3 className="text-orange-800 font-bold tracking-wide uppercase text-sm mb-1">Citizen Identity: Protected</h3>
        <p className="text-orange-700 text-sm">
          The citizen's real identity is not available to you. All communication happens through this case ID only.
        </p>
      </div>
    </div>
  );
}
