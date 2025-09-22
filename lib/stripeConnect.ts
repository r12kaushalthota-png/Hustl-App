import { useAuth } from "@/contexts/AuthContext";
import supabase from "./supabase";

export class StripeConnect {
  /**
   * Get task by ID safely
   */
  static async postEnsureAccount():  Promise<{ accountId: string | null; error: string | null }> {
    try {
      const sessionRes = await supabase.auth.getSession();
      const accessToken = sessionRes.data.session?.access_token;

      if (!accessToken) {
        return { accountId: null, error: 'User not authenticated.' };
      }

      const res = await fetch(`https://blzvlzlopagunugkacyz.functions.supabase.co/connect-ensure-account`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const json = await res.json();

      if (!res.ok) {
        return { accountId: null, error: json?.error || 'Failed to create account' };
      }

      return { accountId: json.accountId ?? null, error: null };
    } catch (error) {
      return { accountId: null, error: error instanceof Error ? error.message : String(error) || 'Network error. Please check your connection.' };
    }
  }

  static async getIsPayoutsenabled(userId: string):  Promise<{ payouts_enabled: boolean | null; error: string | null }> {
    try {
      supabase.from('profiles').select('payouts_enabled').eq('id', userId).single();
      const { data, error } = await supabase
        .from('profiles')
        .select('payouts_enabled')
        .eq('id', userId)
        .single();

      if (error) {
        return { payouts_enabled: null, error: error.message };
      }

      return { payouts_enabled: data?.payouts_enabled ?? null, error: null };
    } catch (error) {
      return { payouts_enabled: null, error: 'Network error. Please check your connection.' };
    }
  }

  static async postAccountLink(userId: string):  Promise<{ url: string | null; error: string | null }> {
    try {
      const sessionRes = await supabase.auth.getSession();
      const accessToken = sessionRes.data.session?.access_token;

      if (!accessToken) {
        return { url: null, error: 'User not authenticated.' };
      }

      const res = await fetch(`https://blzvlzlopagunugkacyz.functions.supabase.co/connect-account-link`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          refresh_url: 'https://blzvlzlopagunugkacyz.functions.supabase.co/connect',
          return_url: `https://blzvlzlopagunugkacyz.functions.supabase.co/connect-onboarding-return?userId=${userId}`,
        }),
      });
      const json = await res.json();

      console.log('Stripe Account Link Response:', json);

      if (!res.ok) {
        return { url: null, error: json?.error || 'Failed to create account link' };
      }

      return { url: json.url ?? null, error: null };
        } catch (error) {
        return { url: null, error: error instanceof Error ? error.message : String(error) || 'Network error. Please check your connection.' };
    }
  }

  static async getConnectOverview(): Promise<{ overview: any | null; error: string | null }> {
    try {
      const sessionRes = await supabase.auth.getSession();
      const accessToken = sessionRes.data.session?.access_token;

      if (!accessToken) {
        return { overview: null, error: 'User not authenticated.' };
      }

      const res = await fetch(`https://blzvlzlopagunugkacyz.functions.supabase.co/get-connect-overview`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const json = await res.json();

      if (!res.ok) {
        return { overview: null, error: json?.error || 'Failed to retrieve account overview' };
      }

      return { overview: json?? null, error: null };
    } catch (error) {
      return { overview: null, error: error instanceof Error ? error.message : String(error) || 'Network error. Please check your connection.' };
    }
  }

  static async postCompleteTransfer(taskId: string): Promise<{ success: boolean; error: string | null; task?: any | null }> {
    try {
      const sessionRes = await supabase.auth.getSession();
      const accessToken = sessionRes.data.session?.access_token;

      if (!accessToken) {
        return { success: false, error: 'User not authenticated.' };
      }

      const res = await fetch(`https://blzvlzlopagunugkacyz.functions.supabase.co/connect-complete-transfer`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId }),
      });

      const json = await res.json();
      console.log('Test 1', json);
      console.log('Test 2', json.transfer.task);
      console.log('Test 3', json.transfer.task.data[0]);

      if (!res.ok) {
        return { success: false, error: json?.error || 'Failed to complete transfer' };
      }

      return { success: true, error: null, task: json.transfer.task.data[0] ?? null };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) || 'Network error. Please check your connection.' };
    }
  }
}