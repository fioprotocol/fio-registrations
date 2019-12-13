<template>
  <div>
    <h1>Add New Admin User</h1>
    <b-form @submit.stop.prevent="onSubmit">
      <b-form-group
        id="email-group" label="Email:" label-for="email" type="email"
          required description="Add New Admin User">
        <b-form-input id="email" ref="email" v-model="email"
          placeholder="Enter email" required>
        </b-form-input>
      </b-form-group>

      <div class="mt-2">
        <b-alert :show="sendInvite.success != null" variant="info" dismissible>
          Invitation Sent!
        </b-alert>
        <b-alert :show="sendInvite.error != null" variant="danger" dismissible>
          {{sendInvite.error}}
        </b-alert>
      </div>

      <b-button type="submit" size="sm" style="width: 150px;">
        <span v-if="!sendInvite._loading">
          Send invitation
        </span>
        <span class="mb-1 spinner-grow spinner-grow-sm text-light"
          v-else role="status" aria-hidden="true"></span>
      </b-button>

    </b-form>
  </div>
</template>

<script>
import {mapState} from 'vuex'

export default {
  name: 'SendInvite',

  data() {
    return {
      email: ''
    }
  },

  methods: {
    onSubmit() {
      const invitePath = this.$router.resolve({name: 'login'})
      const inviteUrl = document.location.origin + invitePath.href

      this.$store.dispatch('Server/post', {
        key: 'sendInvite', path: 'send-invite',
        body: {
          email: this.email,
          inviteUrl
        }
      })
    },

    focusInput() {
      this.$refs['email'].focus();
    },
  },

  computed: {
    ...mapState({
      sendInvite: state => state.Server.sendInvite,
    }),
  },

  beforeDestroy() {
    this.$store.dispatch('Server/reset', {key: 'sendInvite'})
  },

  mounted() {
    this.focusInput()
  },
}
</script>
