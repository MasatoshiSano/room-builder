import { useRef, useState } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import { useTranslation } from '../lib/i18n';

export function SavedPlansSection() {
  const savedPlans = useRoomStore((s) => s.savedPlans);
  const savePlan = useRoomStore((s) => s.savePlan);
  const overwritePlan = useRoomStore((s) => s.overwritePlan);
  const loadPlan = useRoomStore((s) => s.loadPlan);
  const deletePlan = useRoomStore((s) => s.deletePlan);
  const renamePlan = useRoomStore((s) => s.renamePlan);
  const exportSavedPlans = useRoomStore((s) => s.exportSavedPlans);
  const importSavedPlans = useRoomStore((s) => s.importSavedPlans);
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const json = exportSavedPlans();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `room-builder-plans-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch {
      alert(t('plans.fileReadErr'));
      return;
    }
    const replace =
      savedPlans.length > 0 && confirm(t('plans.replaceQ'));
    const result = importSavedPlans(text, replace ? 'replace' : 'merge');
    if (result.error) {
      alert(t('plans.importErr', { error: result.error }));
    } else {
      alert(
        t('plans.imported', {
          added: result.added,
          skipped: result.skipped,
        }),
      );
    }
  };

  return (
    <section className="panel" aria-labelledby="saved-plans">
      <h3 id="saved-plans" className="panel-title">
        {t('plans.title')} ({savedPlans.length})
      </h3>

      <div className="save-row">
        <input
          type="text"
          className="cnf-input full"
          placeholder={t('plans.namePlaceholder')}
          aria-label={t('plans.namePlaceholder')}
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
          {t('plans.save')}
        </button>
      </div>

      <div className="save-row" style={{ marginTop: 6 }}>
        <button
          type="button"
          className="qbtn"
          onClick={handleExport}
          disabled={savedPlans.length === 0}
          title={t('plans.exportTitle')}
        >
          {t('plans.export')}
        </button>
        <button
          type="button"
          className="qbtn"
          onClick={handleImportClick}
          title={t('plans.importTitle')}
        >
          {t('plans.import')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={handleImportFile}
        />
      </div>

      {savedPlans.length === 0 ? (
        <p className="empty-hint">{t('plans.empty')}</p>
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
                        const safeName = String(p.name).replace(/\s+/g, ' ').slice(0, 40);
                        if (confirm(t('plans.overwriteQ', { name: safeName }))) {
                          overwritePlan(p.id);
                        }
                      }}
                      title={t('plans.overwrite')}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="qbtn"
                      onClick={() => {
                        setRenameId(p.id);
                        setRenameDraft(p.name);
                      }}
                      title={t('plans.rename')}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="qbtn is-danger"
                      onClick={() => {
                        const safeName = String(p.name).replace(/\s+/g, ' ').slice(0, 40);
                        if (confirm(t('plans.deleteQ', { name: safeName }))) {
                          deletePlan(p.id);
                        }
                      }}
                      title={t('plans.delete')}
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
