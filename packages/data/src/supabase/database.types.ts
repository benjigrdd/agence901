export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: Database['public']['Enums']['audit_action'];
          actor_id: string | null;
          at: string;
          diff: NonNullable<Json>;
          entity: string;
          entity_id: string | null;
          id: string;
          ip: unknown;
          tenant_id: string | null;
        };
        Insert: {
          action: Database['public']['Enums']['audit_action'];
          actor_id?: string | null;
          at?: string;
          diff?: NonNullable<Json>;
          entity: string;
          entity_id?: string | null;
          id?: string;
          ip?: unknown;
          tenant_id?: string | null;
        };
        Update: {
          action?: Database['public']['Enums']['audit_action'];
          actor_id?: string | null;
          at?: string;
          diff?: NonNullable<Json>;
          entity?: string;
          entity_id?: string | null;
          id?: string;
          ip?: unknown;
          tenant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_log_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      citizen_profiles: {
        Row: {
          consent_at: string | null;
          contact_email: string | null;
          created_at: string;
          district_ids: string[];
          id: string;
          last_seen_at: string;
          locale: string;
          notification_prefs: NonNullable<Json>;
          tenant_id: string;
          topic_ids: string[];
          updated_at: string;
          user_id: string;
          waste_zone_id: string | null;
        };
        Insert: {
          consent_at?: string | null;
          contact_email?: string | null;
          created_at?: string;
          district_ids?: string[];
          id?: string;
          last_seen_at?: string;
          locale?: string;
          notification_prefs?: NonNullable<Json>;
          tenant_id: string;
          topic_ids?: string[];
          updated_at?: string;
          user_id: string;
          waste_zone_id?: string | null;
        };
        Update: {
          consent_at?: string | null;
          contact_email?: string | null;
          created_at?: string;
          district_ids?: string[];
          id?: string;
          last_seen_at?: string;
          locale?: string;
          notification_prefs?: NonNullable<Json>;
          tenant_id?: string;
          topic_ids?: string[];
          updated_at?: string;
          user_id?: string;
          waste_zone_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'citizen_profiles_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'citizen_profiles_tenant_id_waste_zone_id_fkey';
            columns: ['tenant_id', 'waste_zone_id'];
            isOneToOne: false;
            referencedRelation: 'waste_zones';
            referencedColumns: ['tenant_id', 'id'];
          },
        ];
      };
      content_reviews: {
        Row: {
          action: Database['public']['Enums']['review_action'];
          author_id: string;
          comment: string | null;
          created_at: string;
          entity_id: string;
          entity_type: Database['public']['Enums']['reviewable_entity'];
          id: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          action: Database['public']['Enums']['review_action'];
          author_id: string;
          comment?: string | null;
          created_at?: string;
          entity_id: string;
          entity_type: Database['public']['Enums']['reviewable_entity'];
          id?: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          action?: Database['public']['Enums']['review_action'];
          author_id?: string;
          comment?: string | null;
          created_at?: string;
          entity_id?: string;
          entity_type?: Database['public']['Enums']['reviewable_entity'];
          id?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'content_reviews_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      districts: {
        Row: {
          color: string;
          created_at: string;
          geom: unknown;
          id: string;
          name: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          color: string;
          created_at?: string;
          geom: unknown;
          id?: string;
          name: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          geom?: unknown;
          id?: string;
          name?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'districts_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      events: {
        Row: {
          accessible: boolean;
          all_day: boolean;
          author_id: string;
          category: Database['public']['Enums']['event_category'];
          cover_media_id: string | null;
          created_at: string;
          description: NonNullable<Json>;
          ends_at: string;
          id: string;
          location_label: string | null;
          location_point: unknown;
          organizer: string | null;
          place_id: string | null;
          price: Json | null;
          publish_at: string | null;
          registration_url: string | null;
          reviewer_id: string | null;
          rrule: string | null;
          starts_at: string;
          status: Database['public']['Enums']['content_status'];
          tenant_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          accessible?: boolean;
          all_day?: boolean;
          author_id: string;
          category?: Database['public']['Enums']['event_category'];
          cover_media_id?: string | null;
          created_at?: string;
          description?: NonNullable<Json>;
          ends_at: string;
          id?: string;
          location_label?: string | null;
          location_point?: unknown;
          organizer?: string | null;
          place_id?: string | null;
          price?: Json | null;
          publish_at?: string | null;
          registration_url?: string | null;
          reviewer_id?: string | null;
          rrule?: string | null;
          starts_at: string;
          status?: Database['public']['Enums']['content_status'];
          tenant_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          accessible?: boolean;
          all_day?: boolean;
          author_id?: string;
          category?: Database['public']['Enums']['event_category'];
          cover_media_id?: string | null;
          created_at?: string;
          description?: NonNullable<Json>;
          ends_at?: string;
          id?: string;
          location_label?: string | null;
          location_point?: unknown;
          organizer?: string | null;
          place_id?: string | null;
          price?: Json | null;
          publish_at?: string | null;
          registration_url?: string | null;
          reviewer_id?: string | null;
          rrule?: string | null;
          starts_at?: string;
          status?: Database['public']['Enums']['content_status'];
          tenant_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'events_tenant_id_cover_media_id_fkey';
            columns: ['tenant_id', 'cover_media_id'];
            isOneToOne: false;
            referencedRelation: 'media';
            referencedColumns: ['tenant_id', 'id'];
          },
          {
            foreignKeyName: 'events_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_tenant_id_place_id_fkey';
            columns: ['tenant_id', 'place_id'];
            isOneToOne: false;
            referencedRelation: 'places';
            referencedColumns: ['tenant_id', 'id'];
          },
        ];
      };
      job_runs: {
        Row: {
          details: NonNullable<Json>;
          finished_at: string | null;
          id: string;
          job: string;
          started_at: string;
          status: string;
        };
        Insert: {
          details?: NonNullable<Json>;
          finished_at?: string | null;
          id?: string;
          job: string;
          started_at?: string;
          status?: string;
        };
        Update: {
          details?: NonNullable<Json>;
          finished_at?: string | null;
          id?: string;
          job?: string;
          started_at?: string;
          status?: string;
        };
        Relationships: [];
      };
      media: {
        Row: {
          alt_text: string;
          created_at: string;
          credit: string | null;
          decorative: boolean;
          height: number;
          id: string;
          mime: string;
          path: string;
          tenant_id: string;
          updated_at: string;
          width: number;
        };
        Insert: {
          alt_text?: string;
          created_at?: string;
          credit?: string | null;
          decorative?: boolean;
          height: number;
          id?: string;
          mime: string;
          path: string;
          tenant_id: string;
          updated_at?: string;
          width: number;
        };
        Update: {
          alt_text?: string;
          created_at?: string;
          credit?: string | null;
          decorative?: boolean;
          height?: number;
          id?: string;
          mime?: string;
          path?: string;
          tenant_id?: string;
          updated_at?: string;
          width?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'media_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      membership_permissions: {
        Row: {
          created_at: string;
          id: string;
          level: Database['public']['Enums']['permission_level'];
          membership_id: string;
          module: Database['public']['Enums']['module_key'];
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          level: Database['public']['Enums']['permission_level'];
          membership_id: string;
          module: Database['public']['Enums']['module_key'];
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          level?: Database['public']['Enums']['permission_level'];
          membership_id?: string;
          module?: Database['public']['Enums']['module_key'];
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'membership_permissions_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'membership_permissions_tenant_id_membership_id_fkey';
            columns: ['tenant_id', 'membership_id'];
            isOneToOne: false;
            referencedRelation: 'memberships';
            referencedColumns: ['tenant_id', 'id'];
          },
        ];
      };
      memberships: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          disabled_at: string | null;
          id: string;
          invited_at: string | null;
          role: Database['public']['Enums']['app_role'];
          tenant_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          disabled_at?: string | null;
          id?: string;
          invited_at?: string | null;
          role: Database['public']['Enums']['app_role'];
          tenant_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          disabled_at?: string | null;
          id?: string;
          invited_at?: string | null;
          role?: Database['public']['Enums']['app_role'];
          tenant_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'memberships_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_deliveries: {
        Row: {
          created_at: string;
          error: string | null;
          id: string;
          notification_id: string;
          push_token_id: string;
          status: string;
          tenant_id: string;
          ticket_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          error?: string | null;
          id?: string;
          notification_id: string;
          push_token_id: string;
          status?: string;
          tenant_id: string;
          ticket_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          error?: string | null;
          id?: string;
          notification_id?: string;
          push_token_id?: string;
          status?: string;
          tenant_id?: string;
          ticket_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_deliveries_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notification_deliveries_tenant_id_notification_id_fkey';
            columns: ['tenant_id', 'notification_id'];
            isOneToOne: false;
            referencedRelation: 'notifications';
            referencedColumns: ['tenant_id', 'id'];
          },
          {
            foreignKeyName: 'notification_deliveries_tenant_id_push_token_id_fkey';
            columns: ['tenant_id', 'push_token_id'];
            isOneToOne: false;
            referencedRelation: 'push_tokens';
            referencedColumns: ['tenant_id', 'id'];
          },
        ];
      };
      notifications: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          justification: string | null;
          linked_entity: Json | null;
          scheduled_at: string | null;
          sent_at: string | null;
          stats: NonNullable<Json>;
          status: Database['public']['Enums']['notification_status'];
          target: NonNullable<Json>;
          tenant_id: string;
          title: string;
          updated_at: string;
          urgent: boolean;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          id?: string;
          justification?: string | null;
          linked_entity?: Json | null;
          scheduled_at?: string | null;
          sent_at?: string | null;
          stats?: NonNullable<Json>;
          status?: Database['public']['Enums']['notification_status'];
          target: NonNullable<Json>;
          tenant_id: string;
          title: string;
          updated_at?: string;
          urgent?: boolean;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          justification?: string | null;
          linked_entity?: Json | null;
          scheduled_at?: string | null;
          sent_at?: string | null;
          stats?: NonNullable<Json>;
          status?: Database['public']['Enums']['notification_status'];
          target?: NonNullable<Json>;
          tenant_id?: string;
          title?: string;
          updated_at?: string;
          urgent?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      place_categories: {
        Row: {
          color: string;
          created_at: string;
          hidden: boolean;
          icon: string;
          id: string;
          is_default: boolean;
          key: string;
          label: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          color: string;
          created_at?: string;
          hidden?: boolean;
          icon: string;
          id?: string;
          is_default?: boolean;
          key: string;
          label: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          hidden?: boolean;
          icon?: string;
          id?: string;
          is_default?: boolean;
          key?: string;
          label?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'place_categories_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      places: {
        Row: {
          accessibility: NonNullable<Json>;
          address: string;
          category_id: string;
          created_at: string;
          description: string | null;
          external_id: string | null;
          id: string;
          name: string;
          opening_hours: string | null;
          phone: string | null;
          photo_media_id: string | null;
          point: unknown;
          source: Database['public']['Enums']['place_source'];
          tenant_id: string;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          accessibility?: NonNullable<Json>;
          address: string;
          category_id: string;
          created_at?: string;
          description?: string | null;
          external_id?: string | null;
          id?: string;
          name: string;
          opening_hours?: string | null;
          phone?: string | null;
          photo_media_id?: string | null;
          point: unknown;
          source?: Database['public']['Enums']['place_source'];
          tenant_id: string;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          accessibility?: NonNullable<Json>;
          address?: string;
          category_id?: string;
          created_at?: string;
          description?: string | null;
          external_id?: string | null;
          id?: string;
          name?: string;
          opening_hours?: string | null;
          phone?: string | null;
          photo_media_id?: string | null;
          point?: unknown;
          source?: Database['public']['Enums']['place_source'];
          tenant_id?: string;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'places_tenant_id_category_id_fkey';
            columns: ['tenant_id', 'category_id'];
            isOneToOne: false;
            referencedRelation: 'place_categories';
            referencedColumns: ['tenant_id', 'id'];
          },
          {
            foreignKeyName: 'places_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'places_tenant_id_photo_media_id_fkey';
            columns: ['tenant_id', 'photo_media_id'];
            isOneToOne: false;
            referencedRelation: 'media';
            referencedColumns: ['tenant_id', 'id'];
          },
        ];
      };
      posts: {
        Row: {
          alert_level: Database['public']['Enums']['alert_level'] | null;
          author_id: string;
          body: NonNullable<Json>;
          cover_media_id: string | null;
          created_at: string;
          district_ids: string[];
          id: string;
          pinned: boolean;
          publish_at: string | null;
          reviewer_id: string | null;
          send_push: boolean;
          status: Database['public']['Enums']['content_status'];
          summary: string;
          tenant_id: string;
          title: string;
          topic_ids: string[];
          type: Database['public']['Enums']['post_type'];
          unpublish_at: string | null;
          updated_at: string;
        };
        Insert: {
          alert_level?: Database['public']['Enums']['alert_level'] | null;
          author_id: string;
          body?: NonNullable<Json>;
          cover_media_id?: string | null;
          created_at?: string;
          district_ids?: string[];
          id?: string;
          pinned?: boolean;
          publish_at?: string | null;
          reviewer_id?: string | null;
          send_push?: boolean;
          status?: Database['public']['Enums']['content_status'];
          summary: string;
          tenant_id: string;
          title: string;
          topic_ids?: string[];
          type?: Database['public']['Enums']['post_type'];
          unpublish_at?: string | null;
          updated_at?: string;
        };
        Update: {
          alert_level?: Database['public']['Enums']['alert_level'] | null;
          author_id?: string;
          body?: NonNullable<Json>;
          cover_media_id?: string | null;
          created_at?: string;
          district_ids?: string[];
          id?: string;
          pinned?: boolean;
          publish_at?: string | null;
          reviewer_id?: string | null;
          send_push?: boolean;
          status?: Database['public']['Enums']['content_status'];
          summary?: string;
          tenant_id?: string;
          title?: string;
          topic_ids?: string[];
          type?: Database['public']['Enums']['post_type'];
          unpublish_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'posts_tenant_id_cover_media_id_fkey';
            columns: ['tenant_id', 'cover_media_id'];
            isOneToOne: false;
            referencedRelation: 'media';
            referencedColumns: ['tenant_id', 'id'];
          },
          {
            foreignKeyName: 'posts_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      procedures: {
        Row: {
          category: Database['public']['Enums']['procedure_category'];
          created_at: string;
          description: string;
          id: string;
          kind: Database['public']['Enums']['procedure_kind'];
          sort_order: number;
          tenant_id: string;
          title: string;
          updated_at: string;
          value: string;
        };
        Insert: {
          category?: Database['public']['Enums']['procedure_category'];
          created_at?: string;
          description: string;
          id?: string;
          kind: Database['public']['Enums']['procedure_kind'];
          sort_order?: number;
          tenant_id: string;
          title: string;
          updated_at?: string;
          value: string;
        };
        Update: {
          category?: Database['public']['Enums']['procedure_category'];
          created_at?: string;
          description?: string;
          id?: string;
          kind?: Database['public']['Enums']['procedure_kind'];
          sort_order?: number;
          tenant_id?: string;
          title?: string;
          updated_at?: string;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'procedures_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_outbox: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          payload: NonNullable<Json>;
          processed_at: string | null;
          tenant_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind: string;
          payload?: NonNullable<Json>;
          processed_at?: string | null;
          tenant_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          payload?: NonNullable<Json>;
          processed_at?: string | null;
          tenant_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_outbox_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      push_tokens: {
        Row: {
          created_at: string;
          id: string;
          invalid_at: string | null;
          last_seen_at: string;
          locale: string;
          platform: Database['public']['Enums']['push_platform'];
          tenant_id: string;
          token: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          invalid_at?: string | null;
          last_seen_at?: string;
          locale?: string;
          platform: Database['public']['Enums']['push_platform'];
          tenant_id: string;
          token: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          invalid_at?: string | null;
          last_seen_at?: string;
          locale?: string;
          platform?: Database['public']['Enums']['push_platform'];
          tenant_id?: string;
          token?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_tokens_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      report_categories: {
        Row: {
          created_at: string;
          default_service_id: string | null;
          icon: string;
          id: string;
          label: string;
          sla_days: number;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          default_service_id?: string | null;
          icon: string;
          id?: string;
          label: string;
          sla_days?: number;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          default_service_id?: string | null;
          icon?: string;
          id?: string;
          label?: string;
          sla_days?: number;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'report_categories_tenant_id_default_service_id_fkey';
            columns: ['tenant_id', 'default_service_id'];
            isOneToOne: false;
            referencedRelation: 'services';
            referencedColumns: ['tenant_id', 'id'];
          },
          {
            foreignKeyName: 'report_categories_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      report_events: {
        Row: {
          author_id: string | null;
          created_at: string;
          from_status: Database['public']['Enums']['report_status'] | null;
          id: string;
          kind: Database['public']['Enums']['report_event_kind'];
          message: string | null;
          report_id: string;
          tenant_id: string;
          to_status: Database['public']['Enums']['report_status'] | null;
          updated_at: string;
          visibility: Database['public']['Enums']['visibility'];
        };
        Insert: {
          author_id?: string | null;
          created_at?: string;
          from_status?: Database['public']['Enums']['report_status'] | null;
          id?: string;
          kind: Database['public']['Enums']['report_event_kind'];
          message?: string | null;
          report_id: string;
          tenant_id: string;
          to_status?: Database['public']['Enums']['report_status'] | null;
          updated_at?: string;
          visibility?: Database['public']['Enums']['visibility'];
        };
        Update: {
          author_id?: string | null;
          created_at?: string;
          from_status?: Database['public']['Enums']['report_status'] | null;
          id?: string;
          kind?: Database['public']['Enums']['report_event_kind'];
          message?: string | null;
          report_id?: string;
          tenant_id?: string;
          to_status?: Database['public']['Enums']['report_status'] | null;
          updated_at?: string;
          visibility?: Database['public']['Enums']['visibility'];
        };
        Relationships: [
          {
            foreignKeyName: 'report_events_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'report_events_tenant_id_report_id_fkey';
            columns: ['tenant_id', 'report_id'];
            isOneToOne: false;
            referencedRelation: 'reports';
            referencedColumns: ['tenant_id', 'id'];
          },
        ];
      };
      report_media: {
        Row: {
          created_at: string;
          height: number | null;
          id: string;
          path: string;
          report_id: string;
          tenant_id: string;
          updated_at: string;
          width: number | null;
        };
        Insert: {
          created_at?: string;
          height?: number | null;
          id?: string;
          path: string;
          report_id: string;
          tenant_id: string;
          updated_at?: string;
          width?: number | null;
        };
        Update: {
          created_at?: string;
          height?: number | null;
          id?: string;
          path?: string;
          report_id?: string;
          tenant_id?: string;
          updated_at?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'report_media_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'report_media_tenant_id_report_id_fkey';
            columns: ['tenant_id', 'report_id'];
            isOneToOne: false;
            referencedRelation: 'reports';
            referencedColumns: ['tenant_id', 'id'];
          },
        ];
      };
      reports: {
        Row: {
          address: string;
          ai_suggestion: Json | null;
          category_id: string;
          client_request_id: string | null;
          contact_email: string | null;
          created_at: string;
          description: string;
          duplicate_of_id: string | null;
          id: string;
          point: unknown;
          priority: Database['public']['Enums']['report_priority'];
          reference: string;
          reporter_id: string | null;
          resolved_at: string | null;
          service_id: string | null;
          status: Database['public']['Enums']['report_status'];
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          address: string;
          ai_suggestion?: Json | null;
          category_id: string;
          client_request_id?: string | null;
          contact_email?: string | null;
          created_at?: string;
          description: string;
          duplicate_of_id?: string | null;
          id?: string;
          point: unknown;
          priority?: Database['public']['Enums']['report_priority'];
          reference: string;
          reporter_id?: string | null;
          resolved_at?: string | null;
          service_id?: string | null;
          status?: Database['public']['Enums']['report_status'];
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          address?: string;
          ai_suggestion?: Json | null;
          category_id?: string;
          client_request_id?: string | null;
          contact_email?: string | null;
          created_at?: string;
          description?: string;
          duplicate_of_id?: string | null;
          id?: string;
          point?: unknown;
          priority?: Database['public']['Enums']['report_priority'];
          reference?: string;
          reporter_id?: string | null;
          resolved_at?: string | null;
          service_id?: string | null;
          status?: Database['public']['Enums']['report_status'];
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reports_tenant_id_category_id_fkey';
            columns: ['tenant_id', 'category_id'];
            isOneToOne: false;
            referencedRelation: 'report_categories';
            referencedColumns: ['tenant_id', 'id'];
          },
          {
            foreignKeyName: 'reports_tenant_id_duplicate_of_id_fkey';
            columns: ['tenant_id', 'duplicate_of_id'];
            isOneToOne: false;
            referencedRelation: 'reports';
            referencedColumns: ['tenant_id', 'id'];
          },
          {
            foreignKeyName: 'reports_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_tenant_id_service_id_fkey';
            columns: ['tenant_id', 'service_id'];
            isOneToOne: false;
            referencedRelation: 'services';
            referencedColumns: ['tenant_id', 'id'];
          },
        ];
      };
      services: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'services_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      sorting_guide_items: {
        Row: {
          advice: string;
          bin: Database['public']['Enums']['sorting_bin'];
          created_at: string;
          id: string;
          name: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          advice: string;
          bin: Database['public']['Enums']['sorting_bin'];
          created_at?: string;
          id?: string;
          name: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          advice?: string;
          bin?: Database['public']['Enums']['sorting_bin'];
          created_at?: string;
          id?: string;
          name?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sorting_guide_items_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      tenant_app_config: {
        Row: {
          contact: NonNullable<Json>;
          created_at: string;
          home_layout: NonNullable<Json>;
          id: string;
          links: NonNullable<Json>;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          contact: NonNullable<Json>;
          created_at?: string;
          home_layout: NonNullable<Json>;
          id?: string;
          links: NonNullable<Json>;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          contact?: NonNullable<Json>;
          created_at?: string;
          home_layout?: NonNullable<Json>;
          id?: string;
          links?: NonNullable<Json>;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tenant_app_config_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: true;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      tenant_branding: {
        Row: {
          app_name: string;
          colors: NonNullable<Json>;
          created_at: string;
          icon_url: string | null;
          id: string;
          logo_url: string | null;
          short_name: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          app_name: string;
          colors: NonNullable<Json>;
          created_at?: string;
          icon_url?: string | null;
          id?: string;
          logo_url?: string | null;
          short_name: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          app_name?: string;
          colors?: NonNullable<Json>;
          created_at?: string;
          icon_url?: string | null;
          id?: string;
          logo_url?: string | null;
          short_name?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tenant_branding_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: true;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      tenant_counters: {
        Row: {
          key: string;
          tenant_id: string;
          value: number;
          year: number;
        };
        Insert: {
          key: string;
          tenant_id: string;
          value?: number;
          year: number;
        };
        Update: {
          key?: string;
          tenant_id?: string;
          value?: number;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'tenant_counters_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      tenant_internal_notes: {
        Row: {
          notes: string | null;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          notes?: string | null;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          notes?: string | null;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tenant_internal_notes_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: true;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      tenant_modules: {
        Row: {
          created_at: string;
          enabled: boolean;
          id: string;
          module: Database['public']['Enums']['module_key'];
          settings: NonNullable<Json>;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          enabled?: boolean;
          id?: string;
          module: Database['public']['Enums']['module_key'];
          settings?: NonNullable<Json>;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          id?: string;
          module?: Database['public']['Enums']['module_key'];
          settings?: NonNullable<Json>;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tenant_modules_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      tenant_store_info: {
        Row: {
          android_package: string;
          android_rejection_reason: string | null;
          android_status: Database['public']['Enums']['store_publication_status'];
          app_store_id: string | null;
          created_at: string;
          eas_project_id: string | null;
          id: string;
          ios_bundle_id: string;
          ios_rejection_reason: string | null;
          ios_status: Database['public']['Enums']['store_publication_status'];
          onboarding_checklist: NonNullable<Json>;
          play_store_url: string | null;
          tenant_id: string;
          updated_at: string;
          url_scheme: string;
        };
        Insert: {
          android_package: string;
          android_rejection_reason?: string | null;
          android_status?: Database['public']['Enums']['store_publication_status'];
          app_store_id?: string | null;
          created_at?: string;
          eas_project_id?: string | null;
          id?: string;
          ios_bundle_id: string;
          ios_rejection_reason?: string | null;
          ios_status?: Database['public']['Enums']['store_publication_status'];
          onboarding_checklist?: NonNullable<Json>;
          play_store_url?: string | null;
          tenant_id: string;
          updated_at?: string;
          url_scheme: string;
        };
        Update: {
          android_package?: string;
          android_rejection_reason?: string | null;
          android_status?: Database['public']['Enums']['store_publication_status'];
          app_store_id?: string | null;
          created_at?: string;
          eas_project_id?: string | null;
          id?: string;
          ios_bundle_id?: string;
          ios_rejection_reason?: string | null;
          ios_status?: Database['public']['Enums']['store_publication_status'];
          onboarding_checklist?: NonNullable<Json>;
          play_store_url?: string | null;
          tenant_id?: string;
          updated_at?: string;
          url_scheme?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tenant_store_info_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: true;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      tenants: {
        Row: {
          center: unknown;
          contour: unknown;
          created_at: string;
          id: string;
          insee_code: string;
          name: string;
          parent_id: string | null;
          plan: Database['public']['Enums']['tenant_plan'];
          population: number;
          renewal_date: string | null;
          settings: NonNullable<Json>;
          slug: string;
          status: Database['public']['Enums']['tenant_status'];
          timezone: string;
          type: Database['public']['Enums']['tenant_type'];
          updated_at: string;
        };
        Insert: {
          center: unknown;
          contour?: unknown;
          created_at?: string;
          id?: string;
          insee_code: string;
          name: string;
          parent_id?: string | null;
          plan?: Database['public']['Enums']['tenant_plan'];
          population?: number;
          renewal_date?: string | null;
          settings?: NonNullable<Json>;
          slug: string;
          status?: Database['public']['Enums']['tenant_status'];
          timezone?: string;
          type?: Database['public']['Enums']['tenant_type'];
          updated_at?: string;
        };
        Update: {
          center?: unknown;
          contour?: unknown;
          created_at?: string;
          id?: string;
          insee_code?: string;
          name?: string;
          parent_id?: string | null;
          plan?: Database['public']['Enums']['tenant_plan'];
          population?: number;
          renewal_date?: string | null;
          settings?: NonNullable<Json>;
          slug?: string;
          status?: Database['public']['Enums']['tenant_status'];
          timezone?: string;
          type?: Database['public']['Enums']['tenant_type'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tenants_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      topics: {
        Row: {
          created_at: string;
          id: string;
          label: string;
          sort_order: number;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          label: string;
          sort_order?: number;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string;
          sort_order?: number;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'topics_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      usage_daily: {
        Row: {
          active_users: number;
          date: string;
          id: string;
          installs: number;
          posts_published: number;
          reports_created: number;
          tenant_id: string;
        };
        Insert: {
          active_users?: number;
          date: string;
          id?: string;
          installs?: number;
          posts_published?: number;
          reports_created?: number;
          tenant_id: string;
        };
        Update: {
          active_users?: number;
          date?: string;
          id?: string;
          installs?: number;
          posts_published?: number;
          reports_created?: number;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'usage_daily_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      waste_schedules: {
        Row: {
          created_at: string;
          exceptions: NonNullable<Json>;
          id: string;
          note: string | null;
          rrule: string;
          tenant_id: string;
          updated_at: string;
          waste_type: Database['public']['Enums']['waste_type'];
          zone_id: string;
        };
        Insert: {
          created_at?: string;
          exceptions?: NonNullable<Json>;
          id?: string;
          note?: string | null;
          rrule: string;
          tenant_id: string;
          updated_at?: string;
          waste_type: Database['public']['Enums']['waste_type'];
          zone_id: string;
        };
        Update: {
          created_at?: string;
          exceptions?: NonNullable<Json>;
          id?: string;
          note?: string | null;
          rrule?: string;
          tenant_id?: string;
          updated_at?: string;
          waste_type?: Database['public']['Enums']['waste_type'];
          zone_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'waste_schedules_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'waste_schedules_tenant_id_zone_id_fkey';
            columns: ['tenant_id', 'zone_id'];
            isOneToOne: false;
            referencedRelation: 'waste_zones';
            referencedColumns: ['tenant_id', 'id'];
          },
        ];
      };
      waste_zones: {
        Row: {
          created_at: string;
          geom: unknown;
          id: string;
          name: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          geom: unknown;
          id?: string;
          name: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          geom?: unknown;
          id?: string;
          name?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'waste_zones_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invitations: { Args: Record<PropertyKey, never>; Returns: number };
      can_manage_members: { Args: { p_tenant_id: string }; Returns: boolean };
      record_invitation: {
        Args: {
          p_actor_id: string;
          p_display_name: string;
          p_permissions: Json;
          p_role: Database['public']['Enums']['app_role'];
          p_tenant_id: string;
          p_user_id: string;
        };
        Returns: string;
      };
      staff_last_sign_in: {
        Args: { p_tenant_id: string };
        Returns: {
          email: string;
          last_sign_in_at: string;
          user_id: string;
        }[];
      };
    };
    Enums: {
      alert_level: 'info' | 'important' | 'urgent';
      app_role: 'admin' | 'agent';
      audit_action:
        | 'create'
        | 'update'
        | 'delete'
        | 'transition'
        | 'invite'
        | 'permissions'
        | 'disable'
        | 'enable'
        | 'upload'
        | 'reorder'
        | 'send'
        | 'platform_access';
      content_status: 'draft' | 'pending_review' | 'scheduled' | 'published' | 'archived';
      event_category: 'culture' | 'sport' | 'association' | 'municipal' | 'youth' | 'other';
      module_key:
        | 'news'
        | 'events'
        | 'reports'
        | 'map'
        | 'mobility'
        | 'procedures'
        | 'participation'
        | 'notifications'
        | 'services'
        | 'environment'
        | 'media'
        | 'districts'
        | 'settings'
        | 'audit';
      notification_status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
      permission_level: 'read' | 'edit' | 'publish';
      place_source: 'manual' | 'osm' | 'irve' | 'csv';
      post_type: 'news' | 'works' | 'decision' | 'alert';
      procedure_category:
        | 'civil_status'
        | 'town_planning'
        | 'elections'
        | 'family'
        | 'social'
        | 'associations'
        | 'other';
      procedure_kind: 'link' | 'phone' | 'email';
      push_platform: 'ios' | 'android';
      report_event_kind: 'status_change' | 'comment' | 'assignment';
      report_priority: 'low' | 'normal' | 'high';
      report_status: 'new' | 'acknowledged' | 'in_progress' | 'resolved' | 'rejected' | 'duplicate';
      review_action: 'submitted' | 'approved' | 'rejected';
      reviewable_entity: 'post' | 'event';
      sorting_bin:
        | 'household'
        | 'recycling'
        | 'glass'
        | 'biowaste'
        | 'bulky'
        | 'green'
        | 'dechetterie'
        | 'other';
      store_publication_status:
        'not_started' | 'accounts_pending' | 'in_review' | 'published' | 'rejected';
      tenant_plan: 'pilot' | 'standard';
      tenant_status: 'onboarding' | 'active' | 'suspended';
      tenant_type: 'commune' | 'epci';
      visibility: 'public' | 'internal';
      waste_type: 'household' | 'recycling' | 'glass' | 'biowaste' | 'bulky' | 'green';
      wheelchair_access: 'yes' | 'limited' | 'no' | 'unknown';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      alert_level: ['info', 'important', 'urgent'],
      app_role: ['admin', 'agent'],
      audit_action: [
        'create',
        'update',
        'delete',
        'transition',
        'invite',
        'permissions',
        'disable',
        'enable',
        'upload',
        'reorder',
        'send',
        'platform_access',
      ],
      content_status: ['draft', 'pending_review', 'scheduled', 'published', 'archived'],
      event_category: ['culture', 'sport', 'association', 'municipal', 'youth', 'other'],
      module_key: [
        'news',
        'events',
        'reports',
        'map',
        'mobility',
        'procedures',
        'participation',
        'notifications',
        'services',
        'environment',
        'media',
        'districts',
        'settings',
        'audit',
      ],
      notification_status: ['scheduled', 'sent', 'failed', 'cancelled'],
      permission_level: ['read', 'edit', 'publish'],
      place_source: ['manual', 'osm', 'irve', 'csv'],
      post_type: ['news', 'works', 'decision', 'alert'],
      procedure_category: [
        'civil_status',
        'town_planning',
        'elections',
        'family',
        'social',
        'associations',
        'other',
      ],
      procedure_kind: ['link', 'phone', 'email'],
      push_platform: ['ios', 'android'],
      report_event_kind: ['status_change', 'comment', 'assignment'],
      report_priority: ['low', 'normal', 'high'],
      report_status: ['new', 'acknowledged', 'in_progress', 'resolved', 'rejected', 'duplicate'],
      review_action: ['submitted', 'approved', 'rejected'],
      reviewable_entity: ['post', 'event'],
      sorting_bin: [
        'household',
        'recycling',
        'glass',
        'biowaste',
        'bulky',
        'green',
        'dechetterie',
        'other',
      ],
      store_publication_status: [
        'not_started',
        'accounts_pending',
        'in_review',
        'published',
        'rejected',
      ],
      tenant_plan: ['pilot', 'standard'],
      tenant_status: ['onboarding', 'active', 'suspended'],
      tenant_type: ['commune', 'epci'],
      visibility: ['public', 'internal'],
      waste_type: ['household', 'recycling', 'glass', 'biowaste', 'bulky', 'green'],
      wheelchair_access: ['yes', 'limited', 'no', 'unknown'],
    },
  },
} as const;
