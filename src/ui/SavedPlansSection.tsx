import { useState } from 'react';
import { useRoomStore } from '../store/useRoomStore';

export function SavedPlansSection() {
  const savedPlans = useRoomStore((s) => s.savedPlans);
  const savePlan = useRoomStore((s) => s.savePlan);
  const loadPlan = useRoomStore((s) => s.loadPlan);
  const deletePlan = useRoomStore((s) => s.deletePlan);
  const renamePlan = useRoomStore((s) => s.renamePlan);

  const [name, setName] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  return (
    <section className="panel" aria-labelledby="saved-plans">
      <h3 id="saved-plans" className="panel-title">
        保存した間取り ({savedPlans.length})
      </h3>

      <div className="save-row">
        <input
          type="text"
          className="cnf-input full"
          placeholder="プラン名（任意）"
          aria-label="保存名"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              savePlan(name);
              setName('');
            }
          }}
        />
        <button
          type="button"
          className="qbtn is-primary"
          onClick={() => {
            savePlan(name);
            setName('');
          }}
        >
          保存
        </button>
      </div>

      {savedPlans.length === 0 ? (
        <p className="empty-hint">まだ保存された間取りはありません。</p>
      ) : (
        <ul className="item-list" role="list">
          {savedPlans.map((p) => {
            const isRenaming = renameId === p.id;
            return (
              <li key={p.id}>
                <div className="saved-row">
                  {isRenaming ? (
                    <input
                      type="text"
                      className="cnf-input full"
                      value={renameDraft}
                      autoFocus
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onBlur={() => {
                        if (renameDraft.trim()) {
                          renamePlan(p.id, renameDraft.trim());
                        }
                        setRenameId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (renameDraft.trim()) {
                            renamePlan(p.id, renameDraft.trim());
                          }
                          setRenameId(null);
                        }
                        if (e.key === 'Escape') setRenameId(null);
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="saved-name-btn"
                      onClick={() => loadPlan(p.id)}
                      title="クリックで読込"
                    >
                      <span className="saved-name">{p.name}</span>
                      <span className="saved-meta">
                        {new Date(p.savedAt).toLocaleString('ja-JP', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </button>
                  )}
                  <div className="saved-actions">
                    <button
                      type="button"
                      className="qbtn"
                      onClick={() => {
                        setRenameId(p.id);
                        setRenameDraft(p.name);
                      }}
                      title="名前を変更"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="qbtn is-danger"
                      onClick={() => {
                        const safeName = String(p.name).replace(/\s+/g, ' ').slice(0, 40);
                        if (confirm(`「${safeName}」を削除しますか？`)) {
                          deletePlan(p.id);
                        }
                      }}
                      title="削除"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
