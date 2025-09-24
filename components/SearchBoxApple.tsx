import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  Keyboard,
} from 'react-native';
import { Colors } from '@/theme/colors';
import {
  AppleLocalSearch,
  type AppleResolved,
} from '@/native/AppleLocalSearch';
import { Store } from 'lucide-react-native';
type Props = {
  placeholder?: string;
  onSelect: (v: { label: string; lat: number; lng: number }) => void;
  biasRegion?: { lat: number; lon: number; span?: number };
  initialText?: string;
  disabled?: boolean;
  minLength?: number;
  onBlurInput: () => void;
  error?: string | boolean;
  setTextInput: (text: string) => void;
  icon?: React.ReactNode;
};

export default function SearchBoxApple({
  placeholder = 'Search place',
  onSelect,
  biasRegion,
  initialText = '',
  disabled,
  minLength = 2,
  onBlurInput,
  error = false,
  setTextInput,
  icon,
}: Props) {
  console.log('Render SearchBoxApple', error);
  const [items, setItems] = useState<{ title: string; subtitle: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const inputRef = useRef<TextInput>(null);
  const focusedRef = useRef(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (t.current) clearTimeout(t.current);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !AppleLocalSearch.available) return;
    const sub = AppleLocalSearch.subscribe((list) => {
      if (!mounted.current) return;
      setItems(list);
      if (focusedRef.current) setOpen(list.length > 0);
      else setOpen(false);
      setLoading(false);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !AppleLocalSearch.available) return;
    if (biasRegion)
      AppleLocalSearch.setRegion(
        biasRegion.lat,
        biasRegion.lon,
        biasRegion.span ?? 0.2
      );
  }, [biasRegion]);

  function onChange(val: string) {
    setTextInput(val);
    onBlurInput();
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => {
      const q = val.trim();
      if (focused) {
        if (q.length < minLength || !AppleLocalSearch.available) {
          setItems([]);
          setOpen(false);
          setLoading(false);
          return;
        }
      }
      if (q.length > 1) {
        setLoading(true);
        AppleLocalSearch.setQuery(q);
      }
    }, 220);
  }

  async function pick(item: { title: string; subtitle: string }) {
    try {
      const res: AppleResolved = await AppleLocalSearch.resolve(
        item.title,
        item.subtitle
      );
      if (!mounted.current) return;
      console.log('test res', res);
      setTextInput?.(res.name);
      setOpen(false);
      AppleLocalSearch.setQuery('');
      setItems([]);
      requestAnimationFrame(() => inputRef.current?.blur());
      onSelect({
        label: res.name + ' - ' + res.formattedAddress,
        lat: res.lat,
        lng: res.lng,
      });
    } catch {
      // ignore
    }
  }

  function onBlur() {
    onBlurInput();
    focusedRef.current = false;
    setFocused(false);
    setTimeout(() => {
      if (!mounted.current) return;
      setOpen(false);
    }, 120);
  }

  function onSubmit() {
    if (items.length > 0) pick(items[0]);
  }

  // Fallback bila bukan iOS/dev client
  if (!AppleLocalSearch.available) {
    return (
      <TextInput
        ref={inputRef}
        placeholder={placeholder}
        value={initialText}
        onChangeText={setTextInput}
        editable={!disabled}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={() => {
          focusedRef.current = true;
          setFocused(true);
          if (initialText.trim().length >= minLength) setOpen(items.length > 0);
        }}
        style={styles.inputText}
      />
    );
  }

  return (
    <View style={[styles.wrap, error && styles.inputError]}>
      {icon}
      <TextInput
        placeholder={placeholder}
        value={initialText}
        onChangeText={onChange}
        onFocus={() => {
          focusedRef.current = true;
          setFocused(true);
          if (initialText.trim().length >= minLength) setOpen(items.length > 0);
        }}
        onBlur={onBlur}
        placeholderTextColor={Colors.semantic.tabInactive}
        onSubmitEditing={onSubmit}
        editable={!disabled}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.inputText}
      />

      {open && items.length > 0 && (
        <View style={styles.dropdown}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {items.map((item, i) => (
              <TouchableOpacity
                key={item.title + item.subtitle + i}
                style={styles.row}
                onPress={() => pick(item)}
                activeOpacity={0.7}
              >
                <Text numberOfLines={1} style={styles.title}>
                  {item.title}
                </Text>
                {!!item.subtitle && (
                  <Text numberOfLines={1} style={styles.subtitle}>
                    {item.subtitle}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {loading && <Text style={styles.hint}>Searching…</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    minHeight: 44,
    backgroundColor: Colors.white,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: Colors.semantic.inputText,
  },
  dropdown: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    maxHeight: 220,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: { fontSize: 14, color: '#111827' },
  subtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  hint: {
    position: 'absolute',
    top: 60,
    left: 12,
    fontSize: 12,
    color: '#9CA3AF',
  },
  inputError: {
    borderColor: Colors.semantic.errorAlert,
  },
});
