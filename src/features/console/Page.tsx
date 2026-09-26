import { router, type Href } from 'expo-router';
import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Card, ErrorState, Icon, ICON_SIZE, pointer, Skeleton, Text, type IconName } from '@/ui';

export type Crumb = { label: string; href?: Href };

/**
 * A console page: `.content` (padding 28/32/40) with the `.page-head` (crumbs, h1, subtitle, toolbar).
 * `crumbs` are the middle trail; "Dashboard" is prepended and the title is appended.
 */
export function ConsolePage({
  title,
  crumbs = [],
  subtitle,
  actions,
  children,
  gap = 24,
  loading,
  error,
  onRetry,
  refreshing,
  onRefresh,
  head,
  home,
  crumbTitle,
}: {
  title: string;
  crumbs?: Crumb[];
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  gap?: number;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Replaces the default page head (for pages whose head is custom). */
  head?: ReactNode;
  /** First breadcrumb; defaults to the console's Dashboard. */
  home?: Crumb;
  /** The last breadcrumb when it differs from the h1 (e.g. "Transport" for "Transport · live"). */
  crumbTitle?: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const trail: Crumb[] = [home ?? { label: t('console.shell.crumbHome'), href: '/console' }, ...crumbs];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      contentContainerStyle={[styles.content, { gap }]}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}>
      {head ?? (
        <View style={styles.head}>
          <View style={{ gap: 6, flexShrink: 1, minWidth: 0 }}>
            <View style={styles.crumbs} accessibilityLabel={t('console.shell.breadcrumb')}>
              {trail.map((c, i) => (
                <Fragment key={`${c.label}${i}`}>
                  {c.href ? (
                    <Pressable accessibilityRole="link" onPress={() => router.navigate(c.href!)} style={pointer}>
                      <Text style={[styles.crumb, { color: colors.muted }]}>{c.label}</Text>
                    </Pressable>
                  ) : (
                    <Text style={[styles.crumb, { color: colors.muted }]}>{c.label}</Text>
                  )}
                  <Icon name="chevronRight" size={12} rawColor={colors.faint} />
                </Fragment>
              ))}
              <Text style={[styles.crumb, { color: colors.ink2 }]} aria-current="page">
                {crumbTitle ?? title}
              </Text>
            </View>
            <Text variant="h1" accessibilityRole="header">
              {title}
            </Text>
            {typeof subtitle === 'string' ? (
              <Text variant="sm" color="muted">
                {subtitle}
              </Text>
            ) : (
              subtitle
            )}
          </View>
          {actions ? <View style={styles.toolbar}>{actions}</View> : null}
        </View>
      )}
      {error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : loading ? (
        <View style={{ gap: 20 }}>
          <Skeleton height={140} style={{ borderRadius: 18 }} />
          <Row>
            <Col span={8}>
              <Skeleton height={320} style={{ borderRadius: 18 }} />
            </Col>
            <Col span={4}>
              <Skeleton height={320} style={{ borderRadius: 18 }} />
            </Col>
          </Row>
        </View>
      ) : (
        children
      )}
    </ScrollView>
  );
}

/** `.grid-12` row: children are `Col`s whose spans add up to 12. Gap 20 by default. */
export function Row({
  children,
  gap = 20,
  align = 'flex-start',
  style,
}: {
  children: ReactNode;
  gap?: number;
  align?: ViewStyle['alignItems'];
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[{ flexDirection: 'row', gap, alignItems: align }, style]}>{children}</View>;
}

/** A `grid-column: span N` cell. */
export function Col({ span, children, style, gap }: { span: number; children?: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexGrow: span, flexShrink: 1, flexBasis: 0, minWidth: 0, gap }, style]}>{children}</View>;
}

/** `.card-head`: title (`t-h3`) + subtitle (`t-xs muted`) on the left, anything on the right. */
export function CardHead({
  title,
  subtitle,
  right,
  icon,
  style,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.cardHead, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1, minWidth: 0 }}>
        {icon ? <Icon name={icon} size={ICON_SIZE.md} rawColor={colors.ink2} /> : null}
        <View style={{ gap: 2, flexShrink: 1, minWidth: 0 }}>
          {typeof title === 'string' ? (
            <Text variant="h3" accessibilityRole="header">
              {title}
            </Text>
          ) : (
            title
          )}
          {typeof subtitle === 'string' ? (
            <Text variant="xs" color="muted">
              {subtitle}
            </Text>
          ) : (
            subtitle
          )}
        </View>
      </View>
      {right ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 }}>{right}</View> : null}
    </View>
  );
}

/** `.card.card-pad` with a column gap: the usual console panel. */
export function Panel({
  children,
  gap = 14,
  pad = 22,
  style,
}: {
  children: ReactNode;
  gap?: number;
  pad?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Card pad={pad} style={[{ gap }, style]}>
      {children}
    </Card>
  );
}

/** `.sw` legend swatch. */
export function Swatch({ color, border, size = 10 }: { color: string; border?: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 3,
        backgroundColor: color,
        boxShadow: border ? `inset 0 0 0 1.5px ${border}` : undefined,
      }}
    />
  );
}

/** A swatch + label, as used in chart legends. */
export function LegendItem({ color, border, label, dashed }: { color: string; border?: string; label: string; dashed?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {dashed ? (
        <View style={{ width: 16, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: color }} />
      ) : (
        <Swatch color={color} border={border} />
      )}
      <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: colors.muted }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 28, paddingHorizontal: 32, paddingBottom: 40 },
  head: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' },
  crumbs: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  crumb: { fontFamily: fonts.semibold, fontSize: 12.5 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
});
