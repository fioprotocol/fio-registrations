<template>
  <div>
    <div>
      <b-table
        :items="users.list"
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

      <div class="row" :hidden="users._loading">
        <b-col cols="auto">
          <b-button size="sm" :to="{name: 'send-invite'}"
          :disabled="rowsSelect.length !== 0">
          Invite new user
          </b-button>
        </b-col>

        <b-col cols="auto" class="ml-auto">
          <b-button
            size="sm" variant="danger" :disabled="!canDelete"
            v-b-modal.delete-modal
          >
          Delete {{canDelete ? `(${rowsSelect.length})` : ''}}
          </b-button>
        </b-col>

        <b-modal id="delete-modal" variant="danger"
          v-if="rowsSelect.length"
          @ok="deleteUsers"
        >
          <div v-if="Login.username === rowsSelect[0].name">
            Are you sure you want to delete <b>your account</b>?
          </div>
          <div v-else>
            Are you sure you want to delete <b>{{rowsSelect[0].name}}</b>?
          </div>
        </b-modal>
      </div>

      <div class="mt-4">
        <b-alert :show="deleteUser.error != null" variant="danger" dismissible>
          {{deleteUser.error}}
        </b-alert>
      </div>
    </div>
  </div>
</template>

<script>
// <!-- <b-table select-mode="multi|single|range" -->
import {mapState} from 'vuex'

export default {
  name: 'Users',

  data() {
    return {
      fields: [
        {
          key: 'username',
          label: 'User'
        },
        {
          key: 'email',
        },
        {
          key: 'created',
          formatter: 'date',
          label: 'Registered'
        },
        {
          key: 'mfa_enabled',
          label: 'MFA',
          formatter: function(val) {
            return val ? 'Yes' : 'No'
          }
        },
        {
          key: 'last_login',
          formatter: 'date'
        },
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
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
    },

    onRowSelected(items) {
      this.rowsSelect = items.map(i => ({
        name: i.username || i.email,
        id: i.id,
      }))
    },

    deleteUsers() {
      this.$store.dispatch('Server/delete', {
        key: 'deleteUser', path: 'user/' + this.rowsSelect[0].id
      })
    },
  },

  watch: {
    ['deleteUser._loading']: function(loading) {
      if(!loading) {
        if(this.Login.username === this.rowsSelect[0].name) {
          this.$store.dispatch('Login/logout')
          this.$router.push({name: 'login'})
        } else {
          this.$store.dispatch('Server/get', {key: 'users'})
        }
      }
    },
  },

  computed: {
    canDelete() {
      return this.rowsSelect.length === 1 && this.users.list.length > 1
    },

    ...mapState({
      users: state => state.Server.users,
      deleteUser: state => state.Server.deleteUser,
      Login: state => state.Login,
    }),
  },

  created() {
    this.$store.dispatch('Server/get', {key: 'users'})
  },

  beforeDestroy() {
    this.$store.dispatch('Server/reset', {key: 'users'})
  },
}
</script>
