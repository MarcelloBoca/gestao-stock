export default function Loading() {
  return (
    <div className="c-page" aria-busy="true">
      <div className="skel" style={{ height: 40, width: 220, borderRadius: 12 }} />
      <div className="skel" style={{ height: 110, borderRadius: 22 }} />
      <div className="skel" style={{ height: 220, borderRadius: 22 }} />
    </div>
  );
}
