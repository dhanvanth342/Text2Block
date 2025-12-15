import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { getSupabaseClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner';
import { UserProfile } from '../types/profile'; // Import the type

interface SettingsModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    user: User;
    isDark: boolean;
}

export function SettingsModal({ isOpen, onOpenChange, user, isDark }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(false);

    // Form State
    const [fullName, setFullName] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');

    // Profile JSONB state
    const [userProfile, setUserProfile] = useState<UserProfile>({
        education_level: '',
        experience_level: '',
        user_introduction: ''
    });

    const supabase = getSupabaseClient();

    // Fetch initial data
    useEffect(() => {
        if (isOpen && user) {
            fetchProfile();
        }
    }, [isOpen, user]);

    const fetchProfile = async () => {
        if (!supabase || !user) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) {
                // If profile doesn't exist, we might just want to show defaults or create one.
                // For now, valid to just log and let user create.
                console.error('Error fetching profile:', error);
                // Fallback to auth metadata if profile fetch fails or is empty
                setFullName(user.user_metadata?.fullName || '');
                setDateOfBirth(user.user_metadata?.dateOfBirth || '');
                return;
            }

            if (data) {
                const profile = data as any;
                setFullName(profile.full_name || user.user_metadata?.fullName || '');
                setDateOfBirth(profile.date_of_birth || user.user_metadata?.dateOfBirth || '');
                
                if (profile.user_profile) {
                    const profileData = profile.user_profile as unknown as UserProfile;
                    // Merge with defaults to ensure all fields exist
                    setUserProfile(prev => ({
                        ...prev,
                        ...profileData
                    }));
                }
            }
        } catch (error) {
            console.error('Unexpected error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!supabase) {
            toast.error('Database connection not available');
            return;
        }

        try {
            setLoading(true);
            
            // 1. Update Profile in 'profiles' table
            const profileUpdate: any = {
                id: user.id,
                email: user.email,
                full_name: fullName,
                date_of_birth: dateOfBirth || null,
                user_profile: userProfile,
            };

            const { error: profileError } = await supabase
                .from('profiles')
                .upsert(profileUpdate);

            if (profileError) {
                console.error('Profile update error:', profileError);
                throw new Error(profileError.message);
            }

            // 2. Optional: Update Auth Metadata for consistency
            // This is useful if other parts of the app rely on user.user_metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: { fullName: fullName, dateOfBirth: dateOfBirth }
            });

            if (authError) {
                console.warn('Auth metadata update failed:', authError);
                // We don't block success on this, but good to know
            }

            toast.success('Settings updated successfully');
            onOpenChange(false);

        } catch (error: any) {
            console.error('Error updating profile:', error);
            toast.error(`Failed to update settings: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className={`${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white text-gray-900'} sm:max-w-[600px] max-h-[85vh] overflow-y-auto`}>
                <DialogHeader>
                    <DialogTitle>Account Settings</DialogTitle>
                    <DialogDescription className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                        Manage your profile details and preferences.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                    <TabsList className={`flex w-full items-center ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                        <TabsTrigger
                            value="general"
                            className="flex-1 data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-all duration-200"
                        >
                            General
                        </TabsTrigger>
                        <Separator orientation="vertical" className={`h-6 mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-300'}`} />
                        <TabsTrigger
                            value="profile"
                            className="flex-1 data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-all duration-200"
                        >
                            Profile Details
                        </TabsTrigger>
                    </TabsList>

                    <Separator className={`my-4 ${isDark ? 'bg-white/20' : 'bg-gray-300'}`} />

                    {/* GENERAL TAB */}
                    <TabsContent value="general" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className={isDark ? 'text-gray-300' : ''}>Email</Label>
                            <Input
                                id="email"
                                value={user.email || ''}
                                disabled
                                className={`${isDark ? 'bg-slate-800 border-white/10 text-gray-400' : 'bg-gray-50 text-gray-500'}`}
                            />
                            <p className="text-xs text-gray-500">Email cannot be changed.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="fullName" className={isDark ? 'text-gray-300' : ''}>Full Name</Label>
                            <Input
                                id="fullName"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className={`${isDark ? 'bg-slate-800 border-white/10 text-white' : ''}`}
                                placeholder="Varshith Example"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="dob" className={isDark ? 'text-gray-300' : ''}>Date of Birth</Label>
                            <Input
                                id="dob"
                                type="date"
                                value={dateOfBirth}
                                onChange={(e) => setDateOfBirth(e.target.value)}
                                className={`${isDark ? 'bg-slate-800 border-white/10 text-white' : ''}`}
                            />
                        </div>
                    </TabsContent>

                    {/* PROFILE TAB */}
                    <TabsContent value="profile" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="bio" className={isDark ? 'text-gray-300' : ''}>User Bio / Introduction</Label>
                            <Textarea
                                id="bio"
                                value={userProfile.user_introduction}
                                onChange={(e) => setUserProfile({ ...userProfile, user_introduction: e.target.value })}
                                className={`${isDark ? 'bg-slate-800 border-white/10 text-white' : ''} min-h-[100px]`}
                                placeholder="Tell us a bit about yourself..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="education" className={isDark ? 'text-gray-300' : ''}>Education Level</Label>
                            <Input
                                id="education"
                                value={userProfile.education_level}
                                onChange={(e) => setUserProfile({ ...userProfile, education_level: e.target.value })}
                                className={`${isDark ? 'bg-slate-800 border-white/10 text-white' : ''}`}
                                placeholder="e.g. Master's in Computer Science"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="experience" className={isDark ? 'text-gray-300' : ''}>Experience Level</Label>
                            <Input
                                id="experience"
                                value={userProfile.experience_level}
                                onChange={(e) => setUserProfile({ ...userProfile, experience_level: e.target.value })}
                                className={`${isDark ? 'bg-slate-800 border-white/10 text-white' : ''}`}
                                placeholder="e.g. 5 years as Senior Dev"
                            />
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="mt-6">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className={isDark ? 'text-gray-300 border-white/10 hover:bg-white/10 hover:text-white' : ''}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading} className="btn-primary">
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
