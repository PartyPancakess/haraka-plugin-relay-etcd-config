[![NPM][npm-img]][npm-url]

# haraka-plugin-relay-etcd-config

This plugin is based on Haraka relay plugin.
It gets its ACL list from etcd server.


## Configuration
Running etcd server must have key(s) in the config/mta/domains/\<domain>/relay format.
Relays must be added to every domain separately.

### Example etcd Configuration

For every user:

\<IP or Subnet in CIDR format>\<CRLF>

```
etcdctl put config/mta/domains/domain.com/relay "10.10.10.10/32
10.10.10.0/24
"
```





<!-- leave these buried at the bottom of the document -->
[npm-img]: https://nodei.co/npm/haraka-plugin-relay-etcd-config.png
[npm-url]: https://www.npmjs.com/package/haraka-plugin-relay-etcd-config
