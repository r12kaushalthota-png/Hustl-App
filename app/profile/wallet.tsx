import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Wallet,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  DollarSign,
  Gift,
  Award,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { GamificationRepo } from '@/lib/gamificationRepo';
import { StripeConnect } from '@/lib/stripeConnect';

// Exact brand colors from the logo
const BrandColors = {
  primary: '#0D2DEB', // Hustl Blue
  purple: '#6B2BBF', // Hustl Purple
  red: '#E53935', // Hustl Red
  orange: '#FF5A1F', // Hustl Orange
  accentYellow: '#FFC400', // Badge yellow
  surface: '#FFFFFF',
  title: '#0A0F1F',
  subtitle: '#5B6475',
  divider: '#E9EDF5',
};

// Brand gradients
const BrandGradients = {
  primary: [
    BrandColors.primary,
    BrandColors.purple,
    BrandColors.red,
    BrandColors.orange,
  ],
  button: [BrandColors.primary, '#3D6BFF'],
};

interface Transaction {
  id: string;
  type: 'earned' | 'spent' | 'bonus';
  amount: number;
  description: string;
  date: string;
  taskId?: string;
}

// Mock transaction data
const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'earned',
    amount: 500,
    description: 'Food delivery completed',
    date: '2025-01-15T10:30:00Z',
    taskId: 'task-1',
  },
  {
    id: '2',
    type: 'spent',
    amount: 300,
    description: 'Coffee run payment',
    date: '2025-01-14T15:45:00Z',
    taskId: 'task-2',
  },
  {
    id: '3',
    type: 'bonus',
    amount: 1000,
    description: 'Referral bonus',
    date: '2025-01-13T09:15:00Z',
  },
  {
    id: '4',
    type: 'earned',
    amount: 750,
    description: 'Grocery shopping completed',
    date: '2025-01-12T14:20:00Z',
    taskId: 'task-3',
  },
  {
    id: '5',
    type: 'spent',
    amount: 200,
    description: 'Study buddy session',
    date: '2025-01-11T11:00:00Z',
    taskId: 'task-4',
  },
];

export default function WalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState(0.0);
  const [isBalanceLoading, setIsBalanceLoading] = useState(true);

  useEffect(() => {
    loadOverview();
    loadWalletData();
  }, []);

  const loadOverview = async () => {
    const data = await StripeConnect.getConnectOverview();

    const balanceAmount = data.overview?.balance?.available
      ?data.overview.balance.available[0].amount
      : 0;
    setBalance(balanceAmount);
    setIsBalanceLoading(false);
  };


  const formatCurrency = (cents: number): string => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const loadWalletData = async () => {
    setIsLoading(true);

    try {
      // In a real app, load from API
      // For now, use mock data
      setTransactions(mockTransactions);

      // Calculate balance from user profile or transactions
      // const userBalance = user?.profile?.credits || 0;
      // setBalance(userBalance);
    } catch (error) {
      console.error('Failed to load wallet data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned':
        return (
          <TrendingUp size={16} color={BrandColors.surface} strokeWidth={2} />
        );
      case 'spent':
        return (
          <TrendingDown size={16} color={BrandColors.surface} strokeWidth={2} />
        );
      case 'bonus':
        return <Gift size={16} color={BrandColors.surface} strokeWidth={2} />;
      default:
        return (
          <DollarSign size={16} color={BrandColors.surface} strokeWidth={2} />
        );
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earned':
        return '#10B981';
      case 'spent':
        return BrandColors.red;
      case 'bonus':
        return BrandColors.accentYellow;
      default:
        return BrandColors.subtitle;
    }
  };

  const renderTransaction = (transaction: Transaction) => (
    <View key={transaction.id} style={styles.transactionCard}>
      <View style={styles.transactionLeft}>
        <View
          style={[
            styles.transactionIcon,
            { backgroundColor: getTransactionColor(transaction.type) },
          ]}
        >
          {getTransactionIcon(transaction.type)}
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription}>
            {transaction.description}
          </Text>
          <Text style={styles.transactionDate}>
            {formatDate(transaction.date)}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.transactionAmount,
          {
            color: transaction.type === 'spent' ? BrandColors.red : '#10B981',
          },
        ]}
      >
        {transaction.type === 'spent' ? '-' : '+'}
        {formatCurrency(transaction.amount)}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color={BrandColors.surface} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      >
        {/* Balance Card */}
        <View style={styles.balanceSection}>
          <View style={styles.balanceCard}>
            <LinearGradient
              colors={BrandGradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              locations={[0, 0.4, 0.7, 1]}
              style={styles.balanceGradient}
            >
              <View style={styles.balanceHeader}>
                <View style={styles.balanceIconContainer}>
                  <Wallet
                    size={24}
                    color={BrandColors.surface}
                    strokeWidth={2}
                  />
                </View>
                <Text style={styles.balanceLabel}>Available Balance</Text>
              </View>

              <Text style={styles.balanceAmount}>
                {isBalanceLoading ? 'Load balance...' : formatCurrency(balance)}
              </Text>

              <View style={styles.balanceActions}>
                <TouchableOpacity style={styles.balanceActionButton}>
                  <Plus size={16} color={BrandColors.surface} strokeWidth={2} />
                  <Text style={styles.balanceActionText}>Add Funds</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.balanceActionButton}>
                  <Minus
                    size={16}
                    color={BrandColors.surface}
                    strokeWidth={2}
                  />
                  <Text style={styles.balanceActionText}>Withdraw</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <TrendingUp size={20} color="#10B981" strokeWidth={2} />
              </View>
              <Text style={styles.statValue}>$24.50</Text>
              <Text style={styles.statLabel}>This Month</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Award
                  size={20}
                  color={BrandColors.accentYellow}
                  strokeWidth={2}
                />
              </View>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Tasks Done</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Gift size={20} color={BrandColors.purple} strokeWidth={2} />
              </View>
              <Text style={styles.statValue}>$10.00</Text>
              <Text style={styles.statLabel}>Referrals</Text>
            </View>
          </View>
        </View>

        {/* Transactions */}
        <View style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={BrandColors.primary} />
              <Text style={styles.loadingText}>Loading transactions...</Text>
            </View>
          ) : transactions.length > 0 ? (
            <View style={styles.transactionsList}>
              {transactions.map(renderTransaction)}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No transactions yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Complete tasks to start earning credits
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BrandColors.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: BrandColors.surface,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  balanceSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  balanceCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  balanceGradient: {
    padding: 24,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  balanceIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: BrandColors.surface,
    opacity: 0.9,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: BrandColors.surface,
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  balanceActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  balanceActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.surface,
  },
  statsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: BrandColors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: BrandColors.divider,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BrandColors.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.title,
  },
  statLabel: {
    fontSize: 12,
    color: BrandColors.subtitle,
    textAlign: 'center',
  },
  transactionsSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: BrandColors.title,
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: BrandColors.subtitle,
  },
  transactionsList: {
    gap: 8,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BrandColors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BrandColors.divider,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: BrandColors.title,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 14,
    color: BrandColors.subtitle,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: BrandColors.title,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: BrandColors.subtitle,
    textAlign: 'center',
  },
});
