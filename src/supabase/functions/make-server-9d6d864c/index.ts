import { Hono } from 'npm:hono@3.10.0';
import { cors } from 'npm:hono@3.10.0/cors';
import { logger } from 'npm:hono@3.10.0/logger';
import { createClient } from 'npm:@supabase/supabase-js@2.49.8';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Sign up route
app.post('/make-server-9d6d864c/signup', async (c) => {
    try {
        const { email, password, fullName, dateOfBirth, educationLevel, experienceLevel, userIntroduction } = await c.req.json();

        // Validate required fields
        if (!email || !password || !fullName || !dateOfBirth || !educationLevel || !experienceLevel || !userIntroduction) {
            return c.json({ error: 'Missing required fields. All fields are mandatory.' }, 400);
        }

        // Create user with metadata
        const { data: userData, error: userError } = await supabase.auth.admin.createUser({
            email,
            password,
            user_metadata: { fullName, dateOfBirth },
            // Automatically confirm the user's email since an email server hasn't been configured.
            email_confirm: true,
        });

        if (userError) {
            console.error('Error creating user in Auth:', userError);
            return c.json({ error: userError.message }, 400);
        }

        // Construct the JSONB user_profile object
        const userProfileData = {
            education_level: educationLevel,
            experience_level: experienceLevel,
            user_introduction: userIntroduction,
        };

        // Insert or update profile in profiles table with JSONB structure (UPSERT to handle duplicates)
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userData.user.id,
                email: email,
                full_name: fullName,
                date_of_birth: dateOfBirth,
                user_profile: userProfileData, // JSONB column
            }, {
                onConflict: 'id' // Specify the conflict column
            });

        if (profileError) {
            console.error('Error creating profile in profiles table:', profileError);
            // Note: User is already created in auth, but profile failed
            // Consider implementing a cleanup or retry mechanism in production
            return c.json({
                error: 'User account created but profile setup failed. Please contact support.',
                details: profileError.message
            }, 500);
        }

        console.log(`Successfully created user and profile for: ${email}`);
        return c.json({ user: userData.user, message: 'Account created successfully' });
    } catch (error: any) {
        console.error('Sign up error:', error);
        return c.json({ error: error.message || 'Internal server error' }, 500);
    }
});

// Get user profile
app.get('/make-server-9d6d864c/profile', async (c) => {
    try {
        const accessToken = c.req.header('Authorization')?.split(' ')[1];
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);

        if (!user || error) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        // Fetch full profile from profiles table including user_profile JSONB
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error('Error fetching profile data:', profileError);
            // Return basic user data if profile fetch fails
            return c.json({
                fullName: user.user_metadata?.fullName || 'User',
                dateOfBirth: user.user_metadata?.dateOfBirth,
                email: user.email,
                createdAt: user.created_at,
                user_profile: null,
            });
        }

        // Return combined user metadata and profile data
        return c.json({
            id: user.id,
            fullName: profileData.full_name || user.user_metadata?.fullName || 'User',
            dateOfBirth: profileData.date_of_birth || user.user_metadata?.dateOfBirth,
            email: profileData.email || user.email,
            createdAt: user.created_at,
            user_profile: profileData.user_profile, // JSONB containing education, experience, introduction
        });
    } catch (error: any) {
        console.error('Error getting profile:', error);
        return c.json({ error: error.message || 'Internal server error' }, 500);
    }
});

// Update user profile
app.post('/make-server-9d6d864c/profile/update', async (c) => {
    try {
        const accessToken = c.req.header('Authorization')?.split(' ')[1];
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);

        if (!user || error) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        const { full_name, date_of_birth, user_profile } = await c.req.json();

        // Validations (e.g. check not nulls) can happen here too if strictness is needed

        // Update metadata in Auth (optional but good for consistency)
        if (full_name || date_of_birth) {
            await supabase.auth.admin.updateUserById(
                user.id,
                { user_metadata: { fullName: full_name, dateOfBirth: date_of_birth } }
            );
        }

        // Upsert profile in profiles table
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                email: user.email,
                full_name: full_name,
                date_of_birth: date_of_birth || null,
                user_profile: user_profile,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (profileError) {
            console.error('Error updating profile:', profileError);
            return c.json({ error: profileError.message }, 500);
        }

        return c.json({ profile: profileData });
    } catch (error: any) {
        console.error('Error updating profile:', error);
        return c.json({ error: error.message || 'Internal server error' }, 500);
    }
});

// Get conversations
app.get('/make-server-9d6d864c/conversations', async (c) => {
    try {
        const accessToken = c.req.header('Authorization')?.split(' ')[1];
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);

        if (!user || error) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        const { data: conversations, error: conversationsError } = await supabase
            .from('conversations')
            .select('id, topic, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (conversationsError) {
            console.error('Error getting conversations:', conversationsError);
            return c.json({ error: conversationsError.message }, 500);
        }

        return c.json({ conversations: conversations || [] });
    } catch (error: any) {
        console.error('Error getting conversations:', error);
        return c.json({ error: error.message || 'Internal server error' }, 500);
    }
});

// Get specific conversation with content
app.get('/make-server-9d6d864c/conversations/:id', async (c) => {
    try {
        const accessToken = c.req.header('Authorization')?.split(' ')[1];
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);

        if (!user || error) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        const conversationId = c.req.param('id');

        const { data: conversation, error: conversationError } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', conversationId)
            .eq('user_id', user.id)
            .single();

        if (conversationError || !conversation) {
            console.error('Error getting conversation:', conversationError);
            return c.json({ error: 'Conversation not found' }, 404);
        }

        return c.json(conversation);
    } catch (error: any) {
        console.error('Error getting conversation:', error);
        return c.json({ error: error.message || 'Internal server error' }, 500);
    }
});

// Delete conversation
app.delete('/make-server-9d6d864c/conversations/:id', async (c) => {
    try {
        const accessToken = c.req.header('Authorization')?.split(' ')[1];
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);

        if (!user || error) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        const conversationId = c.req.param('id');

        const { error: deleteError } = await supabase
            .from('conversations')
            .delete()
            .eq('id', conversationId)
            .eq('user_id', user.id);

        if (deleteError) {
            console.error('Error deleting conversation:', deleteError);
            return c.json({ error: deleteError.message }, 500);
        }

        return c.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting conversation:', error);
        return c.json({ error: error.message || 'Internal server error' }, 500);
    }
});

// Generate tutorial content
app.post('/make-server-9d6d864c/generate', async (c) => {
    try {
        const { query, title } = await c.req.json();

        // Get user if authenticated
        const accessToken = c.req.header('Authorization')?.split(' ')[1];
        let userId = null;

        if (accessToken && accessToken !== Deno.env.get('SUPABASE_ANON_KEY')) {
            const { data: { user } } = await supabase.auth.getUser(accessToken);
            userId = user?.id;
        }

        // Generate content
        const responsePayload = {
            readTime: Math.floor(Math.random() * 5) + 6, // 6-10 min
            sections: [
                {
                    text: `This comprehensive guide will take you through the fundamental concepts and practical applications 
                of ${query}. Whether you're a beginner or looking to deepen your understanding, 
                this tutorial provides clear explanations backed by visual diagrams and real-world examples.`,
                },
                {
                    text: `Understanding the foundational principles is crucial for mastering ${query}. 
                The system operates through a series of interconnected components, each playing a vital role 
                in the overall architecture. Let's explore how these pieces fit together.`,
                },
                {
                    text: `Now that we understand the basics, let's dive deeper into the implementation specifics. 
                This section covers advanced patterns, best practices, and common pitfalls to avoid 
                when working with ${query} in production environments.`,
                },
                {
                    text: `As you continue your journey with ${query}, remember that mastery comes through 
                consistent practice and experimentation. The patterns and concepts covered in this tutorial 
                provide a solid foundation for building robust, scalable solutions.`,
                },
            ],
            images: [
                'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800',
                'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
                'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800',
            ],
        };

        // Save conversation if user is authenticated
        if (userId) {
            const { data: conversation, error: conversationError } = await supabase
                .from('conversations')
                .insert({
                    user_id: userId,
                    topic: title,
                    response_payload: responsePayload,
                })
                .select()
                .single();

            if (conversationError) {
                console.error('Error saving conversation:', conversationError);
            }

            return c.json({ ...responsePayload, conversationId: conversation?.id });
        }

        return c.json(responsePayload);
    } catch (error: any) {
        console.error('Error generating content:', error);
        return c.json({ error: error.message || 'Internal server error' }, 500);
    }
});

Deno.serve(app.fetch);
