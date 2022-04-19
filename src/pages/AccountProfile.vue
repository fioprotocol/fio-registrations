<template>
  <div>
    <div>
      <b-form @submit="onSubmit">
        <b-form-group id="actor-group"
          label="Actor:" label-for="actor"
        >
          <b-form-input
            id="actor" ref="actor"
            :state="actorValidation"
            v-model="form.actor"
            required minlength="3" maxlength="30"
          ></b-form-input>
        </b-form-group>

        <b-form-group
          id="permission-group" type="permission"
          label="Permission:" label-for="permission"
        >
          <b-form-input
            id="permission" ref="permission"
            v-model="form.permission"
            :state="permissionValidation"
            required minlength="3" maxlength="30"
            placeholder="Enter permission name"
          ></b-form-input>
        </b-form-group>

        <b-form-group
            id="profile-name-group"
            label="Profile Name:" label-for="name"
        >
          <b-form-input
              id="name"
              minlength="3" maxlength="30"
              :state="profileNameValidation"
              v-model="form.name"
              placeholder="Enter profile name"
          ></b-form-input>
        </b-form-group>

        <br/>
        <div class="mt-2">
          <b-alert :show="!!saveAccountProfile.success" variant="info" dismissible>
            {{ saveAccountProfile.success }}
          </b-alert>

          <b-alert :show="!!saveAccountProfile.error" variant="danger" dismissible>
            {{ saveAccountProfile.error }}
          </b-alert>
        </div>

        <div class="row">
          <b-col cols="auto">
            <b-button type="submit" size="sm" :disabled="!valid">
              Save
            </b-button>
          </b-col>
          <b-col cols="auto" class="ml-auto">
            <b-button size="sm" @click="reset()" variant="warning">
              Reset
            </b-button>
          </b-col>
        </div>
      </b-form>

      <b-modal ref="unsavedModal"
        title="Warning" ok-title="Discard Changes" cancel-title="Stay Here"
        @ok="$router.push(to)" @hidden="to = null"
        ok-variant="warning"
      >
        Leave without saving changes?
      </b-modal>
    </div>
  </div>
</template>

<script>
import Vue from 'vue'
import {mapState} from 'vuex'

function formDefaults () {
  return  {
    actor: '',
    permission: '',
    name: '',
  }
}

export default {
  name: 'AccountProfile',

  data() {
    return {
      form: formDefaults(),
      to: null
    }
  },

  watch: {
    ['accountProfile._loading']: function(loading) {
      if(!loading) {
        for(let key in this.form) {
          this.form[key] = this.accountProfile[key]
        }
      }
    },

    ['saveAccountProfile.success']: function(success) {
      if(success) {
        this.getAccountProfile();
      }
    },

    ['saveAccountProfile.id']: function(id) {
      if(id) {
        this.$router.push({path: `account-profile/${id}`});
      }
      this.profileId = id;
      this.getAccountProfile();
    },
  },

  beforeRouteLeave (to, from, next) {
    if(this.to || !this.modified()) {
      next()
      return
    }
    this.to = to;
    this.$refs.unsavedModal.show()
  },

  props: {
    profileId: {
      type: String,
      default: null
    },
  },

  methods: {
    getAccountProfile() {
      const { profileId } = this;
      if (profileId) {
        this.$store.dispatch('Server/get', {
          key: 'accountProfile', path: 'account-profile/' + profileId,
        })

      }
    },

    formatToForm() {
      const form = {}
      const defaults = formDefaults()
      for(let key in this.form) {
        let value
        const backendValue = this.accountProfile[key]
        value = backendValue == null ? defaults[key] : backendValue
        form[key] = value
      }
      return form
    },

    reset() {
      if(this.accountProfile) {
        const form = this.formatToForm()
        for(let key in this.form) {
          this.form[key] = form[key]
        }
      }
    },

    modified() {
      if(!this.accountProfile) {
        return false
      }
      for(let key in this.form) {
        if(this.form[key] !== this.accountProfile[key]) {
          return true
        }
      }
    },

    onSubmit(evt) {
      evt.preventDefault()

      const body = { ...this.form }

      this.$store.dispatch('Server/post', {
        key: 'saveAccountProfile', path: `account-profile/${this.profileId || ''}`, body
      })
    },
  },

  computed: {
    ...mapState({
      accountProfile: state => state.Server.accountProfile,
      saveAccountProfile: state => state.Server.saveAccountProfile,
    }),

    valid() {
      return this.permissionValidation && this.profileNameValidation && this.actorValidation;
    },

    actorValidation() {
      const { actor } = this.form
      return /^[a-zA-Z0-9]{12,12}$/.test(actor || '')
    },

    permissionValidation() {
      const { permission } = this.form
      return /(^[a-z1-5.]{0,11}[a-z1-5]$)|(^[a-z1-5.]{12}[a-j1-5]$)/.test(permission || '')
    },

    profileNameValidation() {
      const { name } = this.form
      return /^[a-z][a-z0-9]{2,29}$/.test(name || '')
    },
  },

  created() {
    this.getAccountProfile()
  },

  beforeDestroy() {
    this.$store.dispatch('Server/reset', {key: 'accountProfile'})
    this.$store.dispatch('Server/reset', {key: 'saveAccountProfile'})
  },
}
</script>
