import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Checkbox, IconButton, pointer, Text } from '@/ui';

export type Column<T> = {
  key: string;
  title: ReactNode;
  /** Fixed width in px; otherwise the column takes `flex` (default 1) of the free space. */
  width?: number;
  flex?: number;
  align?: 'left' | 'right' | 'center';
  render: (row: T, index: number) => ReactNode;
};

/**
 * `.table` inside a card: uppercase 11px header on `--subtle`, 13/16 cell padding, hover and selected rows.
 * Strings and numbers render as 13.5px body text; pass nodes for anything richer.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowPress,
  isSelected,
  selection,
  empty,
  style,
  rowHeight,
  dense,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowPress?: (row: T) => void;
  /** Highlights a row (`tr.sel`). */
  isSelected?: (row: T) => boolean;
  /** Adds a checkbox column. */
  selection?: { selected: Set<string>; onChange: (next: Set<string>) => void; label: (row: T) => string; allLabel: string };
  empty?: ReactNode;
  style?: StyleProp<ViewStyle>;
  rowHeight?: number;
  dense?: boolean;
}) {
  const { colors } = useTheme();
  const cellPad = dense ? { paddingVertical: 9, paddingHorizontal: 14 } : { paddingVertical: 13, paddingHorizontal: 16 };
  const allOn = !!selection && rows.length > 0 && rows.every((r) => selection.selected.has(rowKey(r)));
  const colStyle = (c: Column<T>): ViewStyle =>
    c.width ? { width: c.width, flexShrink: 0 } : { flexGrow: c.flex ?? 1, flexShrink: 1, flexBasis: 0, minWidth: 0 };
  const justify = (c: Column<T>): ViewStyle['alignItems'] =>
    c.align === 'right' ? 'flex-end' : c.align === 'center' ? 'center' : 'flex-start';

  return (
    <View style={style} accessibilityRole={'table' as never}>
      <View style={[styles.row, { backgroundColor: colors.subtle, borderBottomColor: colors.line }]} accessibilityRole={'row' as never}>
        {selection ? (
          <View style={[styles.checkCell, { paddingVertical: 12 }]}>
            <Checkbox
              checked={allOn}
              label={selection.allLabel}
              onChange={(on) => {
                const next = new Set(selection.selected);
                rows.forEach((r) => (on ? next.add(rowKey(r)) : next.delete(rowKey(r))));
                selection.onChange(next);
              }}
            />
          </View>
        ) : null}
        {columns.map((c) => (
          <View
            key={c.key}
            style={[colStyle(c), { paddingVertical: 12, paddingHorizontal: cellPad.paddingHorizontal, alignItems: justify(c) }]}
            accessibilityRole={'columnheader' as never}>
            {typeof c.title === 'string' ? (
              <Text style={[styles.th, { color: colors.muted, textAlign: c.align ?? 'left' }]} numberOfLines={2}>
                {c.title}
              </Text>
            ) : (
              c.title
            )}
          </View>
        ))}
      </View>
      {rows.length === 0 && empty ? <View style={{ padding: 22 }}>{empty}</View> : null}
      {rows.map((row, i) => {
        const key = rowKey(row);
        const selected = isSelected?.(row) || selection?.selected.has(key);
        const cells = (
          <>
            {selection ? (
              <View style={[styles.checkCell, { paddingVertical: cellPad.paddingVertical }]}>
                <Checkbox
                  checked={selection.selected.has(key)}
                  label={selection.label(row)}
                  onChange={(on) => {
                    const next = new Set(selection.selected);
                    if (on) next.add(key);
                    else next.delete(key);
                    selection.onChange(next);
                  }}
                />
              </View>
            ) : null}
            {columns.map((c) => {
              const content = c.render(row, i);
              return (
                <View
                  key={c.key}
                  style={[colStyle(c), cellPad, { alignItems: justify(c), justifyContent: 'center' }]}
                  accessibilityRole={'cell' as never}>
                  {typeof content === 'string' || typeof content === 'number' ? (
                    <Text style={[styles.td, { color: colors.ink, textAlign: c.align ?? 'left' }]} numberOfLines={2}>
                      {content}
                    </Text>
                  ) : (
                    content
                  )}
                </View>
              );
            })}
          </>
        );
        const rowStyle = (hovered?: boolean) => [
          styles.row,
          { borderBottomColor: colors.line, borderBottomWidth: i === rows.length - 1 ? 0 : 1, minHeight: rowHeight },
          { backgroundColor: selected ? colors.brandSoft : hovered ? colors.subtle : 'transparent' },
        ];
        return onRowPress ? (
          <Pressable
            key={key}
            accessibilityRole={'row' as never}
            onPress={() => onRowPress(row)}
            style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [...rowStyle(hovered), pointer]}>
            {cells}
          </Pressable>
        ) : (
          <HoverRow key={key} style={rowStyle}>
            {cells}
          </HoverRow>
        );
      })}
    </View>
  );
}

function HoverRow({ children, style }: { children: ReactNode; style: (hovered?: boolean) => StyleProp<ViewStyle> }) {
  return (
    <Pressable
      accessibilityRole={'row' as never}
      focusable={false}
      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => style(hovered)}>
      {children}
    </Pressable>
  );
}

/** The grey footer strip under a table: a note on the left, a link or pager on the right. */
export function TableFoot({ children, right }: { children?: ReactNode; right?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.foot, { backgroundColor: colors.subtle, borderTopColor: colors.line }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {typeof children === 'string' ? (
          <Text variant="xs" color="ink2">
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
      {right}
    </View>
  );
}

/** "1–10 of 1,248" with previous/next buttons. */
export function Pager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const { t } = useTranslation();
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text variant="xs" color="muted" num>
        {t('console.shell.pageOf', {
          from: from.toLocaleString('en-IN'),
          to: to.toLocaleString('en-IN'),
          total: total.toLocaleString('en-IN'),
        })}
      </Text>
      <IconButton icon="chevronLeft" size="sm" label={t('console.shell.prev')} disabled={page <= 1} onPress={() => onPage(page - 1)} />
      <IconButton icon="chevronRight" size="sm" label={t('console.shell.next')} disabled={to >= total} onPress={() => onPage(page + 1)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch', borderBottomWidth: 1 },
  checkCell: { width: 52, paddingLeft: 16, justifyContent: 'center' },
  th: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.88, textTransform: 'uppercase' },
  td: { fontFamily: fonts.medium, fontSize: 13.5, lineHeight: 19 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 22, borderTopWidth: 1 },
});
