export function ScrollToBottomButton({
  visible,
  onClick,
}: {
  visible: boolean;
  onClick: () => void;
}) {
  if (!visible) return null;

  return (
    <button
      type="button"
      className="chat-scroll-to-bottom"
      aria-label="Scroll to latest messages"
      onClick={onClick}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M8 3.5v7M4.75 8.25 8 11.5l3.25-3.25"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>New messages</span>
    </button>
  );
}
