import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView, 
  ActivityIndicator,
  Image,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search, User, Clock, MapPin, Store, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { TaskRepo } from '@/lib/taskRepo';

interface SearchResult {
  id: string;
  type: 'task' | 'user';
  title: string;
  subtitle: string;
  metadata?: string;
  avatar_url?: string;
  reward_cents?: number;
  store?: string;
  dropoff_address?: string;
  status?: string;
  major?: string;
  university?: string;
}

export default function SearchModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const inputRef = useRef<TextInput>(null);
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    // Auto-focus the input when modal opens
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch(query.trim());
      } else {
        setResults([]);
        setHasSearched(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    setHasSearched(true);
    
    try {
      const searchResults: SearchResult[] = [];
      
      // Search tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,store.ilike.%${searchQuery}%,dropoff_address.ilike.%${searchQuery}%`)
        .eq('status', 'open')
        .limit(10);

      if (tasks) {
        tasks.forEach(task => {
          searchResults.push({
            id: task.id,
            type: 'task',
            title: task.title,
            subtitle: task.description || 'No description',
            metadata: `${task.store} → ${task.dropoff_address}`,
            reward_cents: task.reward_cents,
            store: task.store,
            dropoff_address: task.dropoff_address,
            status: task.status,
          });
        });
      }

      // Search users/profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%,major.ilike.%${searchQuery}%`)
        .limit(10);

      if (profiles) {
        profiles.forEach(profile => {
          searchResults.push({
            id: profile.id,
            type: 'user',
            title: profile.full_name || profile.username || 'User',
            subtitle: profile.major || 'Student',
            metadata: profile.university || 'University of Florida',
            avatar_url: profile.avatar_url,
            major: profile.major,
            university: profile.university,
          });
        });
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleResultPress = (result: SearchResult) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }

    if (result.type === 'task') {
      router.push(`/task/${result.id}`);
    } else if (result.type === 'user') {
      // For now, just close the search - could implement user profile view
      router.back();
    }
  };

  const getInitials = (name: string): string => {
    if (!name || !name.trim()) return 'U';
    
    return name
      .trim()
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const highlightText = (text: string, searchQuery: string): React.ReactNode => {
    if (!searchQuery.trim()) return text;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <Text key={index} style={styles.highlightedText}>{part}</Text>
      ) : (
        part
      )
    );
  };

  const renderTaskResult = (result: SearchResult) => (
    <TouchableOpacity
      key={result.id}
      style={styles.resultItem}
      onPress={() => handleResultPress(result)}
      activeOpacity={0.7}
    >
      <View style={styles.taskResultContent}>
        <View style={styles.taskHeader}>
          <Text style={styles.resultTitle} numberOfLines={1}>
            {highlightText(result.title, query)}
          </Text>
          {result.reward_cents && (
            <Text style={styles.taskReward}>
              {TaskRepo.formatReward(result.reward_cents)}
            </Text>
          )}
        </View>
        
        <Text style={styles.resultSubtitle} numberOfLines={1}>
          {highlightText(result.subtitle, query)}
        </Text>
        
        {result.metadata && (
          <View style={styles.taskMetadata}>
            <Store size={14} color={Colors.semantic.tabInactive} strokeWidth={2} />
            <Text style={styles.metadataText} numberOfLines={1}>
              {highlightText(result.metadata, query)}
            </Text>
          </View>
        )}
        
        <View style={styles.taskBadge}>
          <Text style={styles.taskBadgeText}>Task</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderUserResult = (result: SearchResult) => (
    <TouchableOpacity
      key={result.id}
      style={styles.resultItem}
      onPress={() => handleResultPress(result)}
      activeOpacity={0.7}
    >
      <View style={styles.userResultContent}>
        <View style={styles.userAvatar}>
          {result.avatar_url ? (
            <Image source={{ uri: result.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {getInitials(result.title)}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.resultTitle} numberOfLines={1}>
            {highlightText(result.title, query)}
          </Text>
          <Text style={styles.resultSubtitle} numberOfLines={1}>
            {highlightText(result.subtitle, query)}
          </Text>
          {result.metadata && (
            <Text style={styles.userMetadata} numberOfLines={1}>
              {result.metadata}
            </Text>
          )}
        </View>
        
        <View style={styles.userBadge}>
          <Text style={styles.userBadgeText}>User</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      );
    }

    if (!hasSearched) {
      return (
        <View style={styles.placeholderContainer}>
          <Search size={48} color={Colors.semantic.tabInactive} strokeWidth={1} />
          <Text style={styles.placeholderTitle}>Search Hustl</Text>
          <Text style={styles.placeholderSubtitle}>
            Find tasks, users, and content across the platform
          </Text>
        </View>
      );
    }

    if (results.length === 0) {
      return (
        <View style={styles.noResultsContainer}>
          <Search size={48} color={Colors.semantic.tabInactive} strokeWidth={1} />
          <Text style={styles.noResultsTitle}>No results found</Text>
          <Text style={styles.noResultsSubtitle}>
            Try different keywords or check your spelling
          </Text>
        </View>
      );
    }

    return null;
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color={Colors.semantic.bodyText} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search tasks, users, or content..."
            placeholderTextColor={Colors.semantic.tabInactive}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Results */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 16 }
        ]}
      >
        {results.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.resultsContainer}>
            {/* Tasks Section */}
            {groupedResults.task && groupedResults.task.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={styles.sectionTitle}>
                  Tasks ({groupedResults.task.length})
                </Text>
                {groupedResults.task.map(renderTaskResult)}
              </View>
            )}

            {/* Users Section */}
            {groupedResults.user && groupedResults.user.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={styles.sectionTitle}>
                  Users ({groupedResults.user.length})
                </Text>
                {groupedResults.user.map(renderUserResult)}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.screen,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.headingText,
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.divider,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.muted,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.semantic.inputText,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
    gap: 16,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.semantic.headingText,
    textAlign: 'center',
  },
  placeholderSubtitle: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    lineHeight: 24,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
    gap: 16,
  },
  noResultsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.semantic.headingText,
    textAlign: 'center',
  },
  noResultsSubtitle: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    lineHeight: 24,
  },
  resultsContainer: {
    paddingTop: 16,
  },
  resultSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  resultItem: {
    backgroundColor: Colors.semantic.card,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.semantic.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  taskResultContent: {
    padding: 16,
    position: 'relative',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.headingText,
    flex: 1,
    marginRight: 8,
  },
  taskReward: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary,
  },
  resultSubtitle: {
    fontSize: 14,
    color: Colors.semantic.bodyText,
    marginBottom: 8,
    lineHeight: 20,
  },
  taskMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  metadataText: {
    fontSize: 13,
    color: Colors.semantic.tabInactive,
    flex: 1,
  },
  taskBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.primary + '20',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  taskBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.primary,
  },
  userResultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    position: 'relative',
  },
  userAvatar: {
    width: 40,
    height: 40,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  userInfo: {
    flex: 1,
  },
  userMetadata: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
    marginTop: 2,
  },
  userBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.semantic.successAlert + '20',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  userBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.semantic.successAlert,
  },
  highlightedText: {
    backgroundColor: Colors.primary + '30',
    fontWeight: '700',
    color: Colors.primary,
  },
});