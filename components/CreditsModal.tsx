import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  ScrollView,
  Platform,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Gift, TrendingUp, Users, DollarSign, Clock, Plus, ExternalLink } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { GamificationRepo } from '@/lib/gamificationRepo';
import type { CreditTransaction } from '@/types/database';

interface CreditsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CreditsModal({ visible, onClose }: CreditsModalProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (visible && user) {
      loadCreditTransactions();
    }
  }, [visible, user]);

  const loadCreditTransactions = async (refresh = false) => {
    if (!user) return;

    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const { data, error } = await GamificationRepo.getUserCreditTransactions(user.id, 10);
      
      if (data) {
        setTransactions(data);
      }
      
      if (error) {
        console.error('Failed to load credit transactions:', error);
      }
    } catch (error) {
      console.error('Failed to load credit transactions:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleEarnMore = () => {
    triggerHaptics();
    onClose();
    router.push('/(tabs)/referrals');
  };

  const handleRefresh = () => {
    loadCreditTransactions(true);
  };

  const formatCredits = (credits: number): string => {
    return credits.toLocaleString();
  };

  const formatTransactionDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned':
        return <TrendingUp size={16} color={Colors.semantic.successAlert} strokeWidth={2} />;
      case 'spent':
        return <DollarSign size={16} color={Colors.semantic.errorAlert} strokeWidth={2} />;
      case 'purchased':
        return <Plus size={16} color={Colors.primary} strokeWidth={2} />;
      default:
        return <Gift size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earned':
        return Colors.semantic.successAlert;
      case 'spent':
        return Colors.semantic.errorAlert;
      case 'purchased':
        return Colors.primary;
      default:
        return Colors.semantic.tabInactive;
    }
  };

  const renderTransaction = (transaction: CreditTransaction) => (
    <View key={transaction.id} style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <View style={[
          styles.transactionIcon,
          { backgroundColor: getTransactionColor(transaction.transaction_type) + '20' }
        ]}>
          {getTransactionIcon(transaction.transaction_type)}
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionReason}>{transaction.reason}</Text>
          <Text style={styles.transactionDate}>
            {formatTransactionDate(transaction.created_at)}
          </Text>
        </View>
      </View>
      
      <Text style={[
        styles.transactionAmount,
        { 
          color: transaction.transaction_type === 'earned' || transaction.transaction_type === 'purchased'
            ? Colors.semantic.successAlert 
            : Colors.semantic.errorAlert 
        }
      ]}>
        {transaction.transaction_type === 'spent' ? '-' : '+'}
        {formatCredits(transaction.amount)}
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { paddingBottom: insets.bottom + 24 }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.dragHandle} />
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Credits</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.primary}
                colors={[Colors.primary]}
              />
            }
          >
            {/* Credits Balance Card */}
            <View style={styles.creditsCard}>
              <LinearGradient
                colors={['#FA4616', '#FF6B35']}
                style={styles.creditsGradient}
              >
                <View style={styles.creditsContent}>
                  <View style={styles.creditsHeader}>
                    <Gift size={24} color={Colors.white} strokeWidth={2} />
                    <Text style={styles.creditsLabel}>Your Credits</Text>
                  </View>
                  <Text style={styles.creditsAmount}>
                    {formatCredits(user?.profile?.credits || 0)}
                  </Text>
                  <Text style={styles.creditsSubtext}>
                    Earned from tasks and referrals
                  </Text>
                </View>
              </LinearGradient>
            </View>

            {/* Earn More Button */}
            <TouchableOpacity
              style={styles.earnMoreButton}
              onPress={handleEarnMore}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#0047FF', '#0021A5']}
                style={styles.earnMoreGradient}
              >
                <Users size={18} color={Colors.white} strokeWidth={2} />
                <Text style={styles.earnMoreText}>Earn More Credits</Text>
                <ExternalLink size={16} color={Colors.white} strokeWidth={2} />
              </LinearGradient>
            </TouchableOpacity>

            {/* Transaction History */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              
              {isLoading && !isRefreshing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.loadingText}>Loading transactions...</Text>
                </View>
              ) : transactions.length > 0 ? (
                <View style={styles.transactionsList}>
                  {transactions.map(renderTransaction)}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Clock size={32} color={Colors.semantic.tabInactive} strokeWidth={1} />
                  <Text style={styles.emptyStateText}>No transactions yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Complete tasks and refer friends to earn credits
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.semantic.screen,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '50%',
  },
  header: {
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.semantic.tabInactive + '40',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.semantic.headingText,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  creditsCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#FA4616',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  creditsGradient: {
    padding: 24,
  },
  creditsContent: {
    alignItems: 'center',
    gap: 8,
  },
  creditsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creditsLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  creditsAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  creditsSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  earnMoreButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 32,
    shadowColor: '#0021A5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  earnMoreGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  earnMoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
  },
  transactionsList: {
    gap: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.semantic.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.semantic.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionReason: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.headingText,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});