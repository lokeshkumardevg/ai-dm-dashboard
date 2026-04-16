import React, { useMemo, useState } from 'react';
import { Image as ImageIcon, Trash2, Eye, Pencil, Clock3 } from 'lucide-react';

interface CreativeItem {
  _id?: string;
  id?: string;
  title?: string;
  name?: string;
  contentType?: string;
  type?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  createdAt?: string;
  createdAtRaw?: string;
  lifetimeStart?: string;
  lifetimeEnd?: string;
  lifetimeStartRaw?: string;
  lifetimeEndRaw?: string;
  uploadDate?: string;
  status?: string;
  platform?: string;
}

interface CreativesTableProps {
  creatives: CreativeItem[];
  onPreviewCreative: (creative: CreativeItem) => void;
  onWatchCreative: (creative: CreativeItem) => void;
  onEditCreative: (creative: CreativeItem) => void;
  onDeleteCreative: (creative: CreativeItem) => void;
  deletingCreativeId?: string | null;
}

const CreativesTable: React.FC<CreativesTableProps> = ({
  creatives,
  onPreviewCreative,
  onWatchCreative,
  onEditCreative,
  onDeleteCreative,
  deletingCreativeId,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const normalizedCreatives = useMemo(() => {
    return creatives.filter(
      (item) => item.contentType === 'image' || item.type === 'image'
    );
  }, [creatives]);

  if (!normalizedCreatives.length) {
    return (
      <div
        style={{
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          padding: '64px 24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '999px',
            background: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <ImageIcon size={28} color="#94a3b8" />
        </div>

        <h3
          style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: 700,
            color: '#334155',
          }}
        >
          No creatives found
        </h3>

        <p
          style={{
            margin: '6px 0 0',
            fontSize: '0.92rem',
            color: '#94a3b8',
          }}
        >
          AI generated creatives will appear here after you add them to Creative Hub.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="creatives-table-grid">
        {normalizedCreatives.map((creative) => {
          const id = creative._id || creative.id || '';
          const title = creative.title || creative.name || 'Untitled Creative';
          const imageSrc = creative.thumbnailUrl || creative.imageUrl || '';
          const isHovered = hoveredId === id;
          const isDeleting = deletingCreativeId === id;

          return (
            <div
              key={id}
              onMouseEnter={() => setHoveredId(id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                overflow: 'hidden',
                borderRadius: '24px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                boxShadow: isHovered
                  ? '0 18px 40px rgba(15, 23, 42, 0.12)'
                  : '0 4px 12px rgba(15, 23, 42, 0.05)',
                transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                transition: 'all 0.22s ease',
                width: '100%',
                maxWidth: '280px',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  height: '190px',
                  width: '100%',
                  overflow: 'hidden',
                  background: '#f1f5f9',
                }}
              >
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      background: '#f8fafc',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ImageIcon size={40} color="#cbd5e1" />
                  </div>
                )}

                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: isHovered ? 'rgba(0,0,0,0.16)' : 'rgba(0,0,0,0)',
                    transition: 'all 0.22s ease',
                  }}
                />

                <div
                  style={{
                    position: 'absolute',
                    left: '12px',
                    right: '12px',
                    bottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    opacity: isHovered ? 1 : 0,
                    transform: isHovered ? 'translateY(0)' : 'translateY(8px)',
                    pointerEvents: isHovered ? 'auto' : 'none',
                    transition: 'all 0.22s ease',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onDeleteCreative(creative)}
                    disabled={isDeleting}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '999px',
                      border: 'none',
                      background: 'rgba(255,255,255,0.96)',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isDeleting ? 'not-allowed' : 'pointer',
                      boxShadow: '0 8px 20px rgba(15, 23, 42, 0.12)',
                      opacity: isDeleting ? 0.65 : 1,
                    }}
                  >
                    <Trash2 size={16} />
                  </button>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onWatchCreative(creative)}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '999px',
                        border: 'none',
                        background: 'rgba(255,255,255,0.96)',
                        color: '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 8px 20px rgba(15, 23, 42, 0.12)',
                      }}
                    >
                      <Clock3 size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditCreative(creative)}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '999px',
                        border: 'none',
                        background: 'rgba(255,255,255,0.96)',
                        color: '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 8px 20px rgba(15, 23, 42, 0.12)',
                      }}
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onPreviewCreative(creative)}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '999px',
                        border: 'none',
                        background: 'rgba(255,255,255,0.96)',
                        color: '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 8px 20px rgba(15, 23, 42, 0.12)',
                      }}
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div
                style={{
                  borderTop: '1px solid #f1f5f9',
                  padding: '12px 14px 14px',
                }}
              >
                <h3
                  title={title}
                  style={{
                    margin: 0,
                    fontSize: '0.98rem',
                    fontWeight: 500,
                    color: '#111827',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {title}
                </h3>

                <div
                  style={{
                    marginTop: '14px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                    gap: '8px',
                    alignItems: 'center',
                    textAlign: 'center',
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.72rem',
                        fontWeight: 400,
                        color: '#8b95a7',
                        lineHeight: 1.2,
                      }}
                    >
                      Spend
                    </p>
                    <p
                      style={{
                        margin: '8px 0 0',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#111827',
                        lineHeight: 1.2,
                      }}
                    >
                      0
                    </p>
                  </div>

                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.72rem',
                        fontWeight: 400,
                        color: '#8b95a7',
                        lineHeight: 1.2,
                      }}
                    >
                      CTR
                    </p>
                    <p
                      style={{
                        margin: '8px 0 0',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#111827',
                        lineHeight: 1.2,
                      }}
                    >
                      0
                    </p>
                  </div>

                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.72rem',
                        fontWeight: 400,
                        color: '#8b95a7',
                        lineHeight: 1.2,
                      }}
                    >
                      CVR
                    </p>
                    <p
                      style={{
                        margin: '8px 0 0',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#111827',
                        lineHeight: 1.2,
                      }}
                    >
                      0
                    </p>
                  </div>

                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.72rem',
                        fontWeight: 400,
                        color: '#8b95a7',
                        lineHeight: 1.2,
                      }}
                    >
                      Use
                    </p>
                    <p
                      style={{
                        margin: '8px 0 0',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#111827',
                        lineHeight: 1.2,
                      }}
                    >
                      0
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>
        {`
          .creatives-table-grid {
            display: grid;
            grid-template-columns: repeat(1, minmax(260px, 280px));
            gap: 24px;
          }

          @media (min-width: 900px) {
            .creatives-table-grid {
              grid-template-columns: repeat(2, minmax(260px, 280px));
            }
          }

          @media (min-width: 1400px) {
            .creatives-table-grid {
              grid-template-columns: repeat(4, minmax(260px, 280px));
            }
          }
        `}
      </style>
    </>
  );
};

export default CreativesTable;