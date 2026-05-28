import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

const NUM_COLUMNS = 40;
const BLOCKS_PER_COLUMN = 13;

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

function getDimColor(blockLevel: number, maxBlocks: number): string {
  const ratio = blockLevel / maxBlocks;
  if (ratio > 0.82) return '#002210';
  if (ratio > 0.58) return '#001a0a';
  if (ratio > 0.33) return '#001208';
  return '#000e05';
}

// Peak dot per column: tracks the highest point and bounces down
function PeakDot({
  columnAnim,
  maxBlocks,
  BLOCK_HEIGHT,
  BLOCK_GAP,
}: {
  columnAnim: Animated.Value;
  maxBlocks: number;
  BLOCK_HEIGHT: number;
  BLOCK_GAP: number;
}) {
  const peakAnim = useRef(new Animated.Value(0)).current;
  const peakRef = useRef(0);
  const bounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bounceAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const id = columnAnim.addListener(({ value }) => {
      if (value >= peakRef.current) {
        // New peak — snap the dot up immediately
        peakRef.current = value;
        if (bounceTimeoutRef.current) clearTimeout(bounceTimeoutRef.current);
        if (bounceAnimRef.current) bounceAnimRef.current.stop();
        peakAnim.setValue(value);

        // After a short hold, start WinXP-style bouncy decay
        bounceTimeoutRef.current = setTimeout(() => {
          bounceAnimRef.current = Animated.spring(peakAnim, {
            toValue: 0,
            useNativeDriver: false,
            speed: 1.8,        // slow fall
            bounciness: 14,    // bouncy overshoot like WinXP
          });
          bounceAnimRef.current.start(() => {
            peakRef.current = 0;
          });
        }, 320);
      }
    });

    return () => {
      columnAnim.removeListener(id);
      if (bounceTimeoutRef.current) clearTimeout(bounceTimeoutRef.current);
    };
  }, [columnAnim, peakAnim]);

  // Convert block level → bottom offset in pixels
  const bottomOffset = peakAnim.interpolate({
    inputRange: [0, maxBlocks],
    outputRange: [0, maxBlocks * (BLOCK_HEIGHT + BLOCK_GAP)],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.peakDot,
        {
          bottom: bottomOffset,
          width: '100%',
          height: BLOCK_HEIGHT,
        },
      ]}
    />
  );
}

export default function VisualizerPlayer({ isPlaying }: { isPlaying: boolean }) {
  const BLOCK_HEIGHT = 9;
  const BLOCK_GAP = 4;

  const columnAnims = useRef(
    Array.from({ length: NUM_COLUMNS }, () => new Animated.Value(0))
  ).current;

  // Reset peaks when paused
  const peakAnims = useRef(
    Array.from({ length: NUM_COLUMNS }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (!isPlaying) {
      // Smoothly drop all columns to 0 — visualizer goes blank
      columnAnims.forEach((anim) => {
        Animated.timing(anim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: false,
        }).start();
      });
      // Also drop all peak dots
      peakAnims.forEach((anim) => {
        Animated.timing(anim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }).start();
      });
      return;
    }

    let isActive = true;

    const animateColumn = (index: number) => {
      if (!isActive) return;
      const maxBlocks = getMaxBlocks(index, NUM_COLUMNS);
      const targetHeight =
        Math.random() > 0.08
          ? Math.floor(Math.random() * maxBlocks) + 1
          : 0;

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
      ]).start(() => {
        if (isActive) animateColumn(index);
      });
    };

    columnAnims.forEach((_, i) => animateColumn(i));

    return () => {
      isActive = false;
    };
  }, [isPlaying]);

  return (
    <View style={styles.container}>
      <View style={styles.screen}>
        {columnAnims.map((anim, colIndex) => {
          const maxBlocks = getMaxBlocks(colIndex, NUM_COLUMNS);

          return (
            <View key={colIndex} style={[styles.column, { position: 'relative' }]}>
              {/* Stacked blocks */}
              {Array.from({ length: maxBlocks }).map((_, blockIndex) => {
                const blockLevel = maxBlocks - blockIndex;
                const activeColor = getBlockColor(blockLevel, maxBlocks);
                const dimColor = 'transparent';
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
                          outputRange: [dimColor, activeColor],
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

              {/* Bouncing peak dot — absolutely positioned */}
              {isPlaying && (
                <PeakDot
                  columnAnim={anim}
                  maxBlocks={maxBlocks}
                  BLOCK_HEIGHT={BLOCK_HEIGHT}
                  BLOCK_GAP={BLOCK_GAP}
                />
              )}
            </View>
          );
        })}
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
    paddingBottom: 10,
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
    height: 9,
    marginBottom: 2,
    borderRadius: 1,
  },
  peakDot: {
    position: 'absolute',
    borderRadius: 1,
    backgroundColor: '#00ff88',
    // Bright glow for the peak dot
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 5,
    shadowOpacity: 1,
  },
}); 