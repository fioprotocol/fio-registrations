<template>
  <div>
    <div>
      <b-table
        :items="accountProfiles.list"
        primary-key="id"
        :fields="fields"
        @row-selected="onRowSelected"
        select-mode="single"
        :selectable="true"
        :striped="false"
        :bordered="false"
        :borderless="false"
        :outlined="true"
        :small="true"
        :hover="true"
        :dark="false"
        :fixed="false"
        :foot-clone="false"
        :no-border-collapse="true"
        :head-variant="null"
        :table-variant="''"
        >
      </b-table>

      <div class="row" :hidden="accountProfiles._loading">
        <b-col cols="auto">
          <b-button size="sm" :to="{path: `/admin/account-profile`}"
          :disabled="rowsSelect.length !== 0">
          Create new Account Profile
          </b-button>
        </b-col>

        <b-col cols="auto" class="ml-auto">
          <b-button size="sm" :to="{path: `/admin/account-profile/${(!rowsSelect.length ? '' : rowsSelect[0].id)}`}" :disabled="!canEdit">
            Edit
          </b-button>
        </b-col>

        <b-col cols="auto" class="ml-0">
          <b-button
            size="sm" variant="danger" :disabled="!canDelete"
            v-b-modal.delete-modal
          >
            Delete
          </b-button>
        </b-col>

        <b-modal id="delete-modal" variant="danger"
          v-if="rowsSelect.length"
          @ok="deleteProfile"
        >
          <div>
            Are you sure you want to delete <b>{{rowsSelect[0].name}}</b>?
          </div>
        </b-modal>
      </div>

      <div class="mt-4">
        <b-alert :show="!!deleteAccountProfile.error" variant="danger" dismissible>
          {{ deleteAccountProfile.error }}
        </b-alert>
      </div>
    </div>
  </div>
</template>

<script>
// <!-- <b-table select-mode="multi|single|range" -->
import {mapState} from 'vuex'

export default {
  name: 'AccountProfiles',

  data() {
    return {
      fields: [
        {
          key: 'actor',
          label: 'Actor'
        },
        {
          key: 'permission',
          label: 'Permission',
        },
        {
          key: 'name',
          label: 'Profile Name',
        },
        {
          key: 'created_at',
          formatter: 'date',
          label: 'Registered'
        },
        // {
        //   key: 'updated_at',
        //   formatter: 'date',
        //   label: 'Last modified'
        // },
      ],
      rowsSelect: []
    }
  },

  methods: {
    date(value) {
      if(!value) {
        return null
      }
      const d = new Date(value)
      return d.toLocaleString()
    },

    onRowSelected(items) {
      this.rowsSelect = items.map(i => ({
        ...i,
      }))
    },

    deleteProfile() {
      this.$store.dispatch('Server/delete', {
        key: 'deleteAccountProfile', path: 'account-profile/' + this.rowsSelect[0].id
      })
    },
  },

  watch: {
    ['deleteAccountProfile._loading']: function(loading) {
      if(!loading) {
        this.$store.dispatch('Server/get', {key: 'accountProfiles', path: 'account-profiles'})
      }
    },
  },

  computed: {
    canEdit() {
      return this.rowsSelect.length === 1
    },
    canDelete() {
      return this.rowsSelect.length === 1 && !this.rowsSelect[0].is_default
    },

    ...mapState({
      accountProfiles: state => state.Server.accountProfiles,
      deleteAccountProfile: state => state.Server.deleteAccountProfile,
    }),
  },

  created() {
    this.$store.dispatch('Server/get', {key: 'accountProfiles', path: 'account-profiles'})
  },

  beforeDestroy() {
    this.$store.dispatch('Server/reset', {key: 'accountProfiles'})
  },
}
</script>
