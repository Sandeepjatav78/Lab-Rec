import { IconBeaker } from "./Icons.jsx";

export default function EmptyState({ title, hint, icon }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon || <IconBeaker size={40} />}</div>
      <div className="empty-title">{title}</div>
      {hint && <div className="empty-hint">{hint}</div>}
    </div>
  );
}
