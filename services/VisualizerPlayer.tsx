import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

const NUM_COLUMNS = 20;
const BLOCKS_PER_COLUMN = 13;
const BLOCK_HEIGHT = 9;
const BLOCK_GAP = 2;

// Total pixel height of N blocks stacked
const stackHeight = (n: number) => n * (BLOCK_HEIGHT + BLOCK_GAP);

function getMaxBlocks(colIndex: number, numCols: number): number {
  const center = (numCols - 1) / 2;
  const distFromCenter = Math.abs(colIndex - center) / center;
  return Math.round(BLOCKS_PER_COLUMN - distFromCenter * 5);
}

function getBlockColor(blockLevel: number, maxBlocks: number): string {
  const ratio = blockLevel / maxBlocks;
  if (ratio > 0.82) return '#00ff88';
  if (ratio > 0.58) return '#00dd55';
  if (ratio > 0.33) return '#00aa33';
  return '#007722';
}

// ---------------------------------------------------------------------------
// PeakDot — sits in an absoluteFill overlay, positioned via `bottom`
// ---------------------------------------------------------------------------
function PeakDot({
  columnAnim,
  maxBlocks,
  colLeft,
  colWidth,
  paddingBottom,
}: {
  columnAnim: Animated.Value;
  maxBlocks: number;
  colLeft: number;
  colWidth: number;
  paddingBottom: number;   // screen's paddingBottom so we share the baseline
}) {
  const peakAnim = useRef(new Animated.Value(0)).current;
  const peakRef = useRef(0);
  const bounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bounceAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const id = columnAnim.addListener(({ value }) => {
      if (value >= peakRef.current) {
        peakRef.current = value;
        if (bounceTimeoutRef.current) clearTimeout(bounceTimeoutRef.current);
        if (bounceAnimRef.current) bounceAnimRef.current.stop();
        peakAnim.setValue(value);

        bounceTimeoutRef.current = setTimeout(() => {
          bounceAnimRef.current = Animated.spring(peakAnim, {
            toValue: 0,
            useNativeDriver: false,
            speed: 1.8,
            bounciness: 20,
          });
          bounceAnimRef.current.start(() => { peakRef.current = 0; });
        }, 320);
      }
    });
    return () => {
      columnAnim.removeListener(id);
      if (bounceTimeoutRef.current) clearTimeout(bounceTimeoutRef.current);
    };
  }, [columnAnim, peakAnim]);

  if (colWidth === 0) return null;

  // `bottom` = paddingBottom + (peakLevel * perBlockPx)
  // This mirrors exactly how the green blocks grow from the bottom of the screen container.
  const bottomOffset = peakAnim.interpolate({
    inputRange: [0, maxBlocks],
    outputRange: [
      paddingBottom,                              // dot at rest = just above baseline
      paddingBottom + stackHeight(maxBlocks),     // dot at peak = top of tallest possible column
    ],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: colLeft,
        width: colWidth,
        height: BLOCK_HEIGHT,
        bottom: bottomOffset,
        borderRadius: 1,
        backgroundColor: '#f200ffff',
        shadowColor: '#f200ffff',
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 5,
        shadowOpacity: 1,
        zIndex: 100,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
export default function VisualizerPlayer({ isPlaying }: { isPlaying: boolean }) {
  const columnAnims = useRef(
    Array.from({ length: NUM_COLUMNS }, () => new Animated.Value(0))
  ).current;

  // x + width of each column, measured inside the screen View
  const [colLayouts, setColLayouts] = useState<{ x: number; width: number }[]>(
    Array.from({ length: NUM_COLUMNS }, () => ({ x: 0, width: 0 }))
  );

  const SCREEN_PADDING_BOTTOM = 10; // must match styles.screen.paddingBottom

  useEffect(() => {
    if (!isPlaying) {
      columnAnims.forEach((anim) =>
        Animated.timing(anim, { toValue: 0, duration: 400, useNativeDriver: false }).start()
      );
      return;
    }

    let isActive = true;

    const animateColumn = (index: number) => {
      if (!isActive) return;
      const maxBlocks = getMaxBlocks(index, NUM_COLUMNS);
      const targetHeight =
        Math.random() > 0.08 ? Math.floor(Math.random() * maxBlocks) + 1 : 0;

      Animated.sequence([
        Animated.timing(columnAnims[index], {
          toValue: targetHeight,
          duration: 80 + Math.random() * 120,
          useNativeDriver: false,
        }),
        Animated.timing(columnAnims[index], {
          toValue: Math.max(0, targetHeight - (1 + Math.floor(Math.random() * 3))),
          duration: 100 + Math.random() * 160,
          useNativeDriver: false,
        }),
      ]).start(() => { if (isActive) animateColumn(index); });
    };

    columnAnims.forEach((_, i) => animateColumn(i));
    return () => { isActive = false; };
  }, [isPlaying]);

  return (
    <View style={styles.container}>
      <View style={styles.screen}>
        {/* ── Green block columns ── */}
        {columnAnims.map((anim, colIndex) => {
          const maxBlocks = getMaxBlocks(colIndex, NUM_COLUMNS);

          return (
            <View
              key={colIndex}
              style={styles.column}
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                setColLayouts((prev) => {
                  const next = [...prev];
                  next[colIndex] = { x, width };
                  return next;
                });
              }}
            >
              {Array.from({ length: maxBlocks }).map((_, blockIndex) => {
                const blockLevel = maxBlocks - blockIndex; // top block = maxBlocks, bottom = 1
                const activeColor = getBlockColor(blockLevel, maxBlocks);
                const glowRadius = blockLevel / maxBlocks > 0.82 ? 6 : 3;
                const glowOpacity = blockLevel / maxBlocks > 0.58 ? 0.9 : 0.6;

                return (
                  <Animated.View
                    key={blockIndex}
                    style={[
                      styles.block,
                      {
                        backgroundColor: anim.interpolate({
                          inputRange: [blockLevel - 1, blockLevel],
                          outputRange: ['transparent', activeColor],
                          extrapolate: 'clamp',
                        }),
                        shadowColor: activeColor,
                        shadowOffset: { width: 0, height: 0 },
                        shadowRadius: glowRadius,
                        shadowOpacity: anim.interpolate({
                          inputRange: [blockLevel - 1, blockLevel],
                          outputRange: [0, glowOpacity],
                          extrapolate: 'clamp',
                        }) as any,
                        elevation: anim.interpolate({
                          inputRange: [blockLevel - 1, blockLevel],
                          outputRange: [0, 4],
                          extrapolate: 'clamp',
                        }) as any,
                      },
                    ]}
                  />
                );
              })}
            </View>
          );
        })}

        {/* ── Peak-dot overlay — rendered last so it's always on top ── */}
        {isPlaying && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {columnAnims.map((anim, colIndex) => (
              <PeakDot
                key={colIndex}
                columnAnim={anim}
                maxBlocks={getMaxBlocks(colIndex, NUM_COLUMNS)}
                colLeft={colLayouts[colIndex].x}
                colWidth={colLayouts[colIndex].width}
                paddingBottom={SCREEN_PADDING_BOTTOM}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    padding: 8,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  screen: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: '#020802',
    paddingHorizontal: 10,
    paddingBottom: 10,   // ← must stay in sync with SCREEN_PADDING_BOTTOM
    paddingTop: 6,
    borderRadius: 6,
    overflow: 'hidden',
  },
  column: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 1.5,
  },
  block: {
    width: '100%',
    height: BLOCK_HEIGHT,
    marginBottom: BLOCK_GAP,
    borderRadius: 1,
  },
});